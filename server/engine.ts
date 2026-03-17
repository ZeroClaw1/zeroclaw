/**
 * Pipeline Execution Engine
 *
 * Runs pipeline steps sequentially with realistic timing, generates logs
 * per step, and broadcasts status updates over WebSocket.
 */
import { randomUUID } from "crypto";
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

// ---- Log line generators per step type ----
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
      `${Math.random() > 0.5 ? "PASS" : "PASS"}  src/core/__tests__/engine.test.ts`,
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

function executeNextStep(state: RunningPipeline) {
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

    step.duration = stepDuration;
    step.logs = logs;

    if (willSucceed) {
      step.status = "success";
      emit("pipeline:step", {
        pipelineId: pipeline.id,
        stepId: step.id,
        status: "success",
        duration: stepDuration,
        stepIndex: state.currentStepIndex,
      });

      // Generate artifact for completed step
      generateStepArtifact(userId, pipeline, step);

      // Move to next step
      state.currentStepIndex++;
      executeNextStep(state);
    } else {
      step.status = "failed";
      emit("pipeline:step", {
        pipelineId: pipeline.id,
        stepId: step.id,
        status: "failed",
        duration: stepDuration,
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
  }, realDelay);
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
