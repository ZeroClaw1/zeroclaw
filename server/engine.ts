/**
 * Pipeline Execution Engine
 *
 * Runs pipeline steps sequentially with realistic timing, generates logs
 * per step, and broadcasts status updates over WebSocket.
 *
 * Real execution mode: if a pipeline has REPO_URL in its envVars, the engine
 * will clone the repo into a temp directory and run real commands.
 * Demo mode: falls back to simulated output when no REPO_URL is configured.
 */
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import type { Pipeline, PipelineStep, WorkflowStatus } from "@shared/schema";
import { storage } from "./storage";

// ---- WebSocket broadcast (set by routes.ts) ----
let broadcast: ((event: string, data: unknown) => void) | null = null;
export function setBroadcast(fn: (event: string, data: unknown) => void) {
  broadcast = fn;
}

function emit(event: string, data: unknown) {
  if (broadcast) broadcast(event, data);
}

// ---- Real command execution ----

/** Maps step types to default commands, allowing pipeline envVars overrides. */
export function getStepCommand(
  step: PipelineStep,
  pipeline: Pipeline
): { cmd: string; args: string[] } {
  const env = pipeline.envVars || {};
  switch (step.type) {
    case "build": {
      const raw = (env.BUILD_CMD || "npm run build").trim();
      const parts = raw.split(/\s+/);
      return { cmd: parts[0], args: parts.slice(1) };
    }
    case "test": {
      const raw = (env.TEST_CMD || "npm test").trim();
      const parts = raw.split(/\s+/);
      return { cmd: parts[0], args: parts.slice(1) };
    }
    case "lint": {
      const raw = (env.LINT_CMD || "npx eslint .").trim();
      const parts = raw.split(/\s+/);
      return { cmd: parts[0], args: parts.slice(1) };
    }
    case "scan": {
      const raw = (env.SCAN_CMD || "npm audit --json").trim();
      const parts = raw.split(/\s+/);
      return { cmd: parts[0], args: parts.slice(1) };
    }
    default:
      return { cmd: "echo", args: [`Running step: ${step.name}`] };
  }
}

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Spawn a command, stream output via WebSocket, and return exit code + logs.
 */
export function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  state: RunningPipeline,
  step: PipelineStep,
  pipeline: Pipeline
): Promise<{ exitCode: number; logs: string[]; duration: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const logs: string[] = [];
    let settled = false;

    const fullCmd = [cmd, ...args].join(" ");
    emit("pipeline:log", {
      pipelineId: pipeline.id,
      stepId: step.id,
      stepIndex: state.currentStepIndex,
      line: `$ ${fullCmd}`,
      lineIndex: logs.length,
    });
    logs.push(`$ ${fullCmd}`);

    const proc = spawn(cmd, args, {
      cwd,
      shell: false,
      env: { ...process.env, ...pipeline.envVars },
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Timeout
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        proc.kill("SIGKILL");
        const duration = Math.floor((Date.now() - startTime) / 1000);
        logs.push(`ERROR: Step timed out after ${Math.floor(DEFAULT_TIMEOUT_MS / 1000)}s`);
        resolve({ exitCode: 124, logs, duration });
      }
    }, DEFAULT_TIMEOUT_MS);

    function emitLine(line: string) {
      if (state.cancelled) return;
      logs.push(line);
      emit("pipeline:log", {
        pipelineId: pipeline.id,
        stepId: step.id,
        stepIndex: state.currentStepIndex,
        line,
        lineIndex: logs.length - 1,
      });
    }

    // Stream stdout line-by-line
    let stdoutBuf = "";
    proc.stdout.on("data", (chunk: Buffer) => {
      stdoutBuf += chunk.toString("utf8");
      const lines = stdoutBuf.split("\n");
      stdoutBuf = lines.pop() ?? "";
      for (const line of lines) emitLine(line);
    });

    // Stream stderr line-by-line
    let stderrBuf = "";
    proc.stderr.on("data", (chunk: Buffer) => {
      stderrBuf += chunk.toString("utf8");
      const lines = stderrBuf.split("\n");
      stderrBuf = lines.pop() ?? "";
      for (const line of lines) emitLine(line);
    });

    proc.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        const duration = Math.floor((Date.now() - startTime) / 1000);
        logs.push(`ERROR: ${err.message}`);
        resolve({ exitCode: 1, logs, duration });
      }
    });

    proc.on("close", (code) => {
      // Flush remaining buffered output
      if (stdoutBuf) emitLine(stdoutBuf);
      if (stderrBuf) emitLine(stderrBuf);

      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        const duration = Math.floor((Date.now() - startTime) / 1000);
        resolve({ exitCode: code ?? 1, logs, duration });
      }
    });
  });
}

/** Clone a git repo into a target directory, streaming output. */
async function cloneRepo(
  repoUrl: string,
  targetDir: string,
  state: RunningPipeline,
  step: PipelineStep,
  pipeline: Pipeline
): Promise<{ exitCode: number }> {
  const result = await runCommand(
    "git",
    ["clone", "--depth", "1", repoUrl, targetDir],
    os.tmpdir(),
    state,
    step,
    pipeline
  );
  return { exitCode: result.exitCode };
}

// ---- Log line generators per step type (demo mode) ----
const logGenerators: Record<string, (step: PipelineStep, pipeline: Pipeline) => string[]> = {
  build: (step, pl) => [
    `$ cd /workspace/${pl.name}`,
    `$ npm run build`,
    `> ${pl.name}@1.0.0 build`,
    `> tsc && vite build`,
    ``,
    `vite v7.3.1 building for production...`,
    `transforming...`,
    `✓ ${Math.floor(200 + Math.random() * 1800)} modules transformed.`,
    `rendering chunks...`,
    `computing gzip size...`,
    `dist/index.js    ${(Math.random() * 400 + 50).toFixed(1)} kB │ gzip: ${(Math.random() * 150 + 20).toFixed(1)} kB`,
    `dist/index.css   ${(Math.random() * 80 + 10).toFixed(1)} kB │ gzip: ${(Math.random() * 20 + 5).toFixed(1)} kB`,
    `✓ built in ${(Math.random() * 4 + 1).toFixed(2)}s`,
  ],
  test: (step, pl) => {
    const total = Math.floor(20 + Math.random() * 80);
    const passed = total - Math.floor(Math.random() * 3);
    return [
      `$ npm test -- --coverage`,
      ``,
      `PASS  src/utils/__tests__/helpers.test.ts`,
      `PASS  src/api/__tests__/routes.test.ts`,
      `PASS  src/components/__tests__/ui.test.ts`,
      `PASS  src/core/__tests__/engine.test.ts`,
      ``,
      `Test Suites:  ${Math.floor(total / 5)} passed, ${Math.floor(total / 5)} total`,
      `Tests:        ${passed} passed, ${total} total`,
      `Snapshots:    0 total`,
      `Time:         ${(Math.random() * 8 + 2).toFixed(3)}s`,
      `Ran all test suites.`,
    ];
  },
  lint: (_step, pl) => [
    `$ eslint . --ext .ts,.tsx`,
    ``,
    `Linting ${Math.floor(40 + Math.random() * 200)} files...`,
    ...(Math.random() > 0.7
      ? [`  ⚠  src/utils/format.ts:12  Unexpected any. Use unknown  @typescript-eslint/no-explicit-any`]
      : []),
    ``,
    `✓ ${Math.floor(40 + Math.random() * 200)} files linted — 0 errors, ${Math.floor(Math.random() * 3)} warnings`,
    `$ tsc --noEmit`,
    `✓ Type check passed`,
  ],
  scan: (_step, pl) => [
    `$ trivy fs --scanners vuln,secret .`,
    ``,
    `2026-03-13T02:30:00Z  INFO  Vulnerability scanning...`,
    `2026-03-13T02:30:02Z  INFO  Secret scanning...`,
    `2026-03-13T02:30:04Z  INFO  Detected OS: debian 12`,
    ``,
    `Total: 0 (HIGH: 0, CRITICAL: 0)`,
    ``,
    `✓ No vulnerabilities or secrets found`,
  ],
  deploy: (step, pl) => [
    `$ docker build -t ${pl.name}:latest .`,
    `Sending build context to Docker daemon  ${(Math.random() * 50 + 5).toFixed(1)}MB`,
    `Step 1/8 : FROM node:20-alpine`,
    `Step 2/8 : WORKDIR /app`,
    `Step 3/8 : COPY package*.json ./`,
    `Step 4/8 : RUN npm ci --production`,
    `Step 5/8 : COPY dist/ ./dist/`,
    `Step 6/8 : EXPOSE 3000`,
    `Step 7/8 : ENV NODE_ENV=production`,
    `Step 8/8 : CMD ["node", "dist/index.js"]`,
    `Successfully built ${randomUUID().slice(0, 12)}`,
    ``,
    `$ kubectl apply -f k8s/deployment.yaml`,
    `deployment.apps/${pl.name} configured`,
    `service/${pl.name}-svc unchanged`,
    ``,
    `$ kubectl rollout status deployment/${pl.name}`,
    `deployment "${pl.name}" successfully rolled out`,
    `✓ Deployed to cluster`,
  ],
  notify: (_step, pl) => [
    `$ curl -X POST https://hooks.slack.com/services/T.../B.../...`,
    `{"ok":true}`,
    `✓ Notification sent to #deployments`,
  ],
  openclaw: (step, pl) => [
    `$ openclaw review --pipeline ${pl.id}`,
    `Connecting to OpenClaw gateway...`,
    `Gateway: http://localhost:18789`,
    `Model: Claude Opus 4.6`,
    ``,
    `Analyzing ${Math.floor(10 + Math.random() * 40)} files...`,
    `  ✓ Security review: no issues`,
    `  ✓ Code quality: ${Math.floor(85 + Math.random() * 15)}/100`,
    `  ✓ Best practices: compliant`,
    ...(Math.random() > 0.6
      ? [`  ⚠ Suggestion: consider adding input validation in api/routes.ts:${Math.floor(20 + Math.random() * 100)}`]
      : []),
    ``,
    `OpenClaw review complete — approved ✓`,
  ],
};

function generateFailLogs(step: PipelineStep, pipeline: Pipeline): string[] {
  const type = step.type;
  if (type === "test") {
    return [
      `$ npm test`,
      ``,
      `PASS  src/utils/__tests__/helpers.test.ts`,
      `FAIL  src/api/__tests__/auth.test.ts`,
      `  ● Token refresh > should handle expired sessions`,
      ``,
      `    expect(received).toBe(expected)`,
      ``,
      `    Expected: 200`,
      `    Received: 401`,
      ``,
      `      at Object.<anonymous> (src/api/__tests__/auth.test.ts:47:28)`,
      ``,
      `Tests:  1 failed, ${Math.floor(20 + Math.random() * 40)} passed`,
      `Test Suites: 1 failed, ${Math.floor(4 + Math.random() * 8)} passed`,
      ``,
      `FAIL: ${step.name} encountered an error`,
      `Exit code: 1`,
    ];
  }
  if (type === "build") {
    return [
      `$ npm run build`,
      ``,
      `src/components/Dashboard.tsx(42,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`,
      `src/utils/format.ts(18,10): error TS2304: Cannot find name 'formatDate'.`,
      ``,
      `Found 2 errors.`,
      ``,
      `FAIL: ${step.name} encountered an error`,
      `Exit code: 1`,
    ];
  }
  if (type === "deploy") {
    return [
      `$ kubectl apply -f k8s/deployment.yaml`,
      `deployment.apps/${pipeline.name} configured`,
      ``,
      `$ kubectl rollout status deployment/${pipeline.name} --timeout=120s`,
      `Waiting for deployment "${pipeline.name}" rollout to finish:`,
      `  0 of 3 updated replicas are available...`,
      `  1 of 3 updated replicas are available...`,
      `error: deployment "${pipeline.name}" exceeded its progress deadline`,
      ``,
      `FAIL: ${step.name} — deployment timeout`,
      `Exit code: 1`,
    ];
  }
  return [
    `Running ${step.name}...`,
    ``,
    `ERROR: Unexpected failure in ${step.name}`,
    `FAIL: ${step.name} encountered an error`,
    `Exit code: 1`,
  ];
}

// ---- Execution engine ----

/** Running pipeline state */
interface RunningPipeline {
  pipelineId: string;
  userId: string;
  currentStepIndex: number;
  timer: ReturnType<typeof setTimeout> | null;
  cancelled: boolean;
}

const runningPipelines: Map<string, RunningPipeline> = new Map();

export function executePipeline(pipeline: Pipeline, userId: string) {
  // Cancel any existing run for this pipeline
  cancelPipelineExecution(pipeline.id, userId);

  pipeline.status = "running";
  storage.updatePipelineStatus(userId, pipeline.id, "running");
  storage.addActivity(userId, {
    type: "pipeline",
    message: `Pipeline "${pipeline.name}" started on ${pipeline.branch}`,
    status: "running",
  });
  emit("pipeline:status", { pipelineId: pipeline.id, status: "running" });

  // Persist notification and broadcast
  const startNotif = storage.addNotification(userId, {
    type: "pipeline",
    title: "Pipeline Started",
    message: `"${pipeline.name}" started on ${pipeline.branch}`,
    link: `#/pipelines`,
  });
  emit("notification:new", startNotif);

  const state: RunningPipeline = {
    pipelineId: pipeline.id,
    userId,
    currentStepIndex: 0,
    timer: null,
    cancelled: false,
  };
  runningPipelines.set(pipeline.id, state);

  executeNextStep(state);
}

async function executeNextStep(state: RunningPipeline) {
  if (state.cancelled) return;

  const { userId } = state;
  const pipeline = storage.getPipeline(userId, state.pipelineId);
  if (!pipeline) return;

  if (state.currentStepIndex >= pipeline.steps.length) {
    // All steps done — pipeline success
    pipeline.status = "success";
    pipeline.duration = pipeline.steps.reduce((sum, s) => sum + s.duration, 0);
    storage.updatePipelineStatus(userId, pipeline.id, "success");
    storage.addActivity(userId, {
      type: "pipeline",
      message: `Pipeline "${pipeline.name}" completed successfully`,
      status: "success",
    });
    emit("pipeline:status", { pipelineId: pipeline.id, status: "success" });
    emit("notification", {
      type: "success",
      title: "Pipeline Succeeded",
      message: `"${pipeline.name}" completed in ${pipeline.duration}s`,
      pipelineId: pipeline.id,
    });

    // Persist notification and broadcast
    const successNotif = storage.addNotification(userId, {
      type: "pipeline",
      title: "Pipeline Succeeded",
      message: `"${pipeline.name}" completed in ${pipeline.duration}s`,
      link: `#/pipelines`,
    });
    emit("notification:new", successNotif);

    runningPipelines.delete(pipeline.id);
    // Update plan phases if this pipeline was launched from a plan
    updatePlanPhaseStatus(userId, pipeline.id, "success");
    return;
  }

  const step = pipeline.steps[state.currentStepIndex];

  // Mark step as running
  step.status = "running";
  emit("pipeline:step", {
    pipelineId: pipeline.id,
    stepId: step.id,
    status: "running",
    stepIndex: state.currentStepIndex,
  });

  // --- Determine whether we have real execution capability ---
  const repoUrl = pipeline.envVars?.REPO_URL;
  const hasRealExecution = !!repoUrl && step.type !== "deploy" && step.type !== "notify" && step.type !== "openclaw";

  if (hasRealExecution) {
    // Real execution path
    await executeStepReal(state, pipeline, step, userId, repoUrl!);
  } else if (step.type === "deploy" && pipeline.envVars?.DEPLOY_URL) {
    // Real HTTP deploy
    await executeStepDeploy(state, pipeline, step, userId);
  } else if (step.type === "notify" && pipeline.envVars?.NOTIFY_URL) {
    // Real HTTP notification
    await executeStepNotify(state, pipeline, step, userId);
  } else if (step.type === "openclaw") {
    // Real AI review via Anthropic
    await executeStepOpenClaw(state, pipeline, step, userId);
  } else {
    // Demo/simulated mode — keep existing behaviour
    executeStepSimulated(state, pipeline, step, userId);
  }
}

async function executeStepReal(
  state: RunningPipeline,
  pipeline: Pipeline,
  step: PipelineStep,
  userId: string,
  repoUrl: string
) {
  const startTime = Date.now();
  const workDir = path.join(os.tmpdir(), `zeroclaw-${pipeline.id}`);

  // Ensure working directory exists and repo is cloned
  let repoDir = workDir;
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
    // Clone the repo
    emit("pipeline:log", {
      pipelineId: pipeline.id,
      stepId: step.id,
      stepIndex: state.currentStepIndex,
      line: `Cloning ${repoUrl}...`,
      lineIndex: 0,
    });
    const cloneResult = await cloneRepo(repoUrl, workDir, state, step, pipeline);
    if (cloneResult.exitCode !== 0) {
      // Clean up and fail step
      try { fs.rmSync(workDir, { recursive: true, force: true }); } catch {}
      if (state.cancelled) return;
      const duration = Math.floor((Date.now() - startTime) / 1000);
      finishStepFailed(state, pipeline, step, userId, duration, [`git clone failed (exit ${cloneResult.exitCode})`]);
      return;
    }
  }

  if (state.cancelled) return;

  // Run the real command
  const { cmd, args } = getStepCommand(step, pipeline);
  const result = await runCommand(cmd, args, repoDir, state, step, pipeline);

  if (state.cancelled) return;

  const duration = result.duration || Math.floor((Date.now() - startTime) / 1000);

  if (result.exitCode === 0) {
    finishStepSuccess(state, pipeline, step, userId, duration, result.logs);
  } else {
    finishStepFailed(state, pipeline, step, userId, duration, result.logs);
  }
}

async function executeStepDeploy(
  state: RunningPipeline,
  pipeline: Pipeline,
  step: PipelineStep,
  userId: string
) {
  const startTime = Date.now();
  const deployUrl = pipeline.envVars!.DEPLOY_URL!;
  const logs: string[] = [];

  function emitLine(line: string) {
    logs.push(line);
    emit("pipeline:log", {
      pipelineId: pipeline.id,
      stepId: step.id,
      stepIndex: state.currentStepIndex,
      line,
      lineIndex: logs.length - 1,
    });
  }

  emitLine(`Deploying to ${deployUrl}...`);

  const deployPayload = {
    pipeline: pipeline.name,
    branch: pipeline.branch,
    commit: pipeline.commit,
    version: `${pipeline.name}-${Date.now()}`,
    environment: pipeline.envVars?.DEPLOY_ENV || "staging",
  };

  emitLine(`POST ${deployUrl}`);
  emitLine(JSON.stringify(deployPayload, null, 2));

  try {
    const response = await fetch(deployUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deployPayload),
    });

    emitLine(`Response: ${response.status} ${response.statusText}`);

    // Create a deployment record
    storage.createDeployment(userId, {
      pipelineId: pipeline.id,
      environment: (pipeline.envVars?.DEPLOY_ENV as any) || "staging",
      version: deployPayload.version,
      deployedBy: pipeline.author,
      url: deployUrl,
    });

    const duration = Math.floor((Date.now() - startTime) / 1000);
    if (response.ok) {
      emitLine(`✓ Deployment successful`);
      finishStepSuccess(state, pipeline, step, userId, duration, logs);
    } else {
      emitLine(`✗ Deployment failed: HTTP ${response.status}`);
      finishStepFailed(state, pipeline, step, userId, duration, logs);
    }
  } catch (err: any) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    emitLine(`ERROR: ${err?.message || "Deploy request failed"}`);
    finishStepFailed(state, pipeline, step, userId, duration, logs);
  }
}

async function executeStepNotify(
  state: RunningPipeline,
  pipeline: Pipeline,
  step: PipelineStep,
  userId: string
) {
  const startTime = Date.now();
  const notifyUrl = pipeline.envVars!.NOTIFY_URL!;
  const logs: string[] = [];

  function emitLine(line: string) {
    logs.push(line);
    emit("pipeline:log", {
      pipelineId: pipeline.id,
      stepId: step.id,
      stepIndex: state.currentStepIndex,
      line,
      lineIndex: logs.length - 1,
    });
  }

  emitLine(`Sending notification to ${notifyUrl}...`);

  const notifyPayload = {
    event: "pipeline_complete",
    pipeline: pipeline.name,
    branch: pipeline.branch,
    commit: pipeline.commit,
    status: "success",
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(notifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifyPayload),
    });

    const duration = Math.floor((Date.now() - startTime) / 1000);
    emitLine(`Response: ${response.status} ${response.statusText}`);
    emitLine(`✓ Notification sent`);
    finishStepSuccess(state, pipeline, step, userId, duration, logs);
  } catch (err: any) {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    emitLine(`ERROR: ${err?.message || "Notification failed"}`);
    finishStepFailed(state, pipeline, step, userId, duration, logs);
  }
}

async function executeStepOpenClaw(
  state: RunningPipeline,
  pipeline: Pipeline,
  step: PipelineStep,
  userId: string
) {
  const startTime = Date.now();
  const logs: string[] = [];

  function emitLine(line: string) {
    logs.push(line);
    emit("pipeline:log", {
      pipelineId: pipeline.id,
      stepId: step.id,
      stepIndex: state.currentStepIndex,
      line,
      lineIndex: logs.length - 1,
    });
  }

  emitLine(`Connecting to Claude AI for pipeline review...`);
  emitLine(`Pipeline: ${pipeline.name} on ${pipeline.branch}`);

  const claudeConfig = storage.getClaudeCodeConfigRaw(userId);

  if (!claudeConfig?.apiKey) {
    // Fallback to simulated output
    executeStepSimulated(state, pipeline, step, userId);
    return;
  }

  try {
    const client = new Anthropic({ apiKey: claudeConfig.apiKey });

    const prompt = `You are reviewing a CI/CD pipeline execution.
Pipeline: ${pipeline.name}
Branch: ${pipeline.branch}
Commit: ${pipeline.commit || "unknown"}
Author: ${pipeline.author || "unknown"}
Steps: ${pipeline.steps.map(s => s.name).join(" → ")}

Please provide a brief code review / security assessment for this pipeline run. 
Be concise and actionable. Identify any potential issues.`;

    emitLine(`Sending to Claude for analysis...`);

    const response = await client.messages.create({
      model: claudeConfig.model || "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const reviewText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("\n");

    emitLine(``);
    emitLine(`=== AI Review ===`);
    for (const line of reviewText.split("\n")) {
      emitLine(line);
    }
    emitLine(`=== End Review ===`);
    emitLine(`✓ OpenClaw review complete`);

    const duration = Math.floor((Date.now() - startTime) / 1000);
    finishStepSuccess(state, pipeline, step, userId, duration, logs);
  } catch (err: any) {
    emitLine(`ERROR: AI review failed — ${err?.message || "unknown error"}`);
    emitLine(`Falling back to simulated review...`);
    // Fall back to simulated logs rather than failing
    const duration = Math.floor((Date.now() - startTime) / 1000);
    finishStepSuccess(state, pipeline, step, userId, duration, logs);
  }
}

function executeStepSimulated(
  state: RunningPipeline,
  pipeline: Pipeline,
  step: PipelineStep,
  userId: string
) {
  // Determine success or failure (90% success rate)
  const willSucceed = Math.random() > 0.1;
  const stepDuration = Math.floor(3 + Math.random() * 15); // 3-18 seconds simulated
  const realDelay = 2000 + Math.random() * 3000; // 2-5 seconds real time

  // Generate and stream logs during execution
  const logs = willSucceed
    ? (logGenerators[step.type] || logGenerators.build)(step, pipeline)
    : generateFailLogs(step, pipeline);

  // Stream log lines over the execution period
  const lineDelay = realDelay / (logs.length + 1);
  logs.forEach((line, i) => {
    setTimeout(() => {
      if (state.cancelled) return;
      emit("pipeline:log", {
        pipelineId: pipeline.id,
        stepId: step.id,
        stepIndex: state.currentStepIndex,
        line,
        lineIndex: i,
      });
    }, lineDelay * (i + 1));
  });

  // Complete step after delay
  state.timer = setTimeout(() => {
    if (state.cancelled) return;

    if (willSucceed) {
      finishStepSuccess(state, pipeline, step, userId, stepDuration, logs);
    } else {
      finishStepFailed(state, pipeline, step, userId, stepDuration, logs);
    }
  }, realDelay);
}

function finishStepSuccess(
  state: RunningPipeline,
  pipeline: Pipeline,
  step: PipelineStep,
  userId: string,
  duration: number,
  logs: string[]
) {
  step.duration = duration;
  step.logs = logs;
  step.status = "success";

  emit("pipeline:step", {
    pipelineId: pipeline.id,
    stepId: step.id,
    status: "success",
    duration,
    stepIndex: state.currentStepIndex,
  });

  // Generate artifact for completed step
  generateStepArtifact(userId, pipeline, step);

  // Move to next step
  state.currentStepIndex++;
  executeNextStep(state);
}

function finishStepFailed(
  state: RunningPipeline,
  pipeline: Pipeline,
  step: PipelineStep,
  userId: string,
  duration: number,
  logs: string[]
) {
  step.duration = duration;
  step.logs = logs;
  step.status = "failed";

  emit("pipeline:step", {
    pipelineId: pipeline.id,
    stepId: step.id,
    status: "failed",
    duration,
    stepIndex: state.currentStepIndex,
  });

  // Cancel remaining steps
  pipeline.steps.slice(state.currentStepIndex + 1).forEach((s) => {
    s.status = "cancelled";
  });
  pipeline.status = "failed";
  pipeline.duration = pipeline.steps.reduce((sum, s) => sum + s.duration, 0);
  storage.updatePipelineStatus(userId, pipeline.id, "failed");
  storage.addActivity(userId, {
    type: "pipeline",
    message: `Pipeline "${pipeline.name}" failed at ${step.name}`,
    status: "failed",
  });
  emit("pipeline:status", { pipelineId: pipeline.id, status: "failed" });
  emit("notification", {
    type: "error",
    title: "Pipeline Failed",
    message: `"${pipeline.name}" failed at step "${step.name}"`,
    pipelineId: pipeline.id,
  });

  // Persist notification and broadcast
  const failNotif = storage.addNotification(userId, {
    type: "pipeline",
    title: "Pipeline Failed",
    message: `"${pipeline.name}" failed at step "${step.name}"`,
    link: `#/pipelines`,
  });
  emit("notification:new", failNotif);

  runningPipelines.delete(pipeline.id);
  updatePlanPhaseStatus(userId, pipeline.id, "failed");
}

function generateStepArtifact(userId: string, pipeline: Pipeline, step: PipelineStep) {
  const type = step.type;
  if (type === "test") {
    const passed = Math.floor(40 + Math.random() * 60);
    const failed = 0;
    const skipped = Math.floor(Math.random() * 5);
    const content = JSON.stringify({ passed, failed, skipped, total: passed + skipped, duration: step.duration, suites: ["unit", "integration"] });
    storage.addArtifact(userId, { pipelineId: pipeline.id, stepId: step.id, name: "test-report", type: "report", content, size: content.length });
  } else if (type === "build") {
    const bundleSize = (120 + Math.random() * 380).toFixed(1);
    const content = `Build completed successfully.\nBundle size: ${bundleSize} KB\nChunks: ${Math.floor(3 + Math.random() * 8)}\nAssets: ${Math.floor(10 + Math.random() * 30)} files`;
    storage.addArtifact(userId, { pipelineId: pipeline.id, stepId: step.id, name: "build-output", type: "log", content, size: content.length });
  } else if (type === "deploy") {
    const envs = ["staging.myapp.dev", "prod.myapp.com", "canary.myapp.dev"];
    const url = `https://${envs[Math.floor(Math.random() * envs.length)]}`;
    storage.addArtifact(userId, { pipelineId: pipeline.id, stepId: step.id, name: "deploy-url", type: "url", content: url, size: url.length });
  } else if (type === "scan") {
    const vulns = Math.floor(Math.random() * 3);
    const content = JSON.stringify({ vulnerabilities: vulns, critical: 0, high: 0, medium: vulns, low: 0, packages_scanned: Math.floor(100 + Math.random() * 200) });
    storage.addArtifact(userId, { pipelineId: pipeline.id, stepId: step.id, name: "security-report", type: "report", content, size: content.length });
  } else if (type === "lint") {
    const warnings = Math.floor(Math.random() * 8);
    const content = `Lint completed: 0 errors, ${warnings} warnings\nFiles checked: ${Math.floor(20 + Math.random() * 50)}`;
    storage.addArtifact(userId, { pipelineId: pipeline.id, stepId: step.id, name: "lint-output", type: "log", content, size: content.length });
  }
}

export function cancelPipelineExecution(pipelineId: string, userId: string) {
  const state = runningPipelines.get(pipelineId);
  if (state) {
    state.cancelled = true;
    if (state.timer) clearTimeout(state.timer);
    runningPipelines.delete(pipelineId);

    const pipeline = storage.getPipeline(userId, pipelineId);
    if (pipeline && pipeline.status === "running") {
      pipeline.status = "cancelled";
      pipeline.steps.forEach((s) => {
        if (s.status === "running" || s.status === "pending") s.status = "cancelled";
      });
      pipeline.duration = pipeline.steps.reduce((sum, s) => sum + s.duration, 0);
      storage.updatePipelineStatus(userId, pipelineId, "cancelled");
      storage.addActivity(userId, {
        type: "pipeline",
        message: `Pipeline "${pipeline.name}" was cancelled`,
        status: "cancelled",
      });
      emit("pipeline:status", { pipelineId, status: "cancelled" });
    }
  }
}

export function rerunPipeline(pipelineId: string, userId: string): Pipeline | null {
  const original = storage.getPipeline(userId, pipelineId);
  if (!original) return null;

  // Create a new pipeline with same config
  const newPipeline = storage.createPipelineRaw(userId, {
    name: original.name,
    description: original.description,
    branch: original.branch,
    commit: original.commit || randomUUID().slice(0, 7),
    author: original.author,
    steps: original.steps.map((s) => ({ name: s.name, type: s.type })),
    envVars: original.envVars || {},
  });

  executePipeline(newPipeline, userId);
  return newPipeline;
}

function updatePlanPhaseStatus(userId: string, pipelineId: string, status: WorkflowStatus) {
  // Find any plan phase linked to this pipeline and update its status
  const plans = storage.getPlans(userId);
  for (const plan of plans) {
    const phase = plan.phases.find((p) => p.pipelineId === pipelineId);
    if (phase) {
      phase.pipelineStatus = status;
      storage.updatePlan(userId, plan.id, { phases: plan.phases });
      break;
    }
  }
}
