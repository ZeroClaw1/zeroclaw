/**
 * Agent Runtime Engine
 *
 * Schedules and executes queued agent tasks using the user's Claude API key.
 * Agents with "online" status are polled every 10 seconds for queued tasks.
 */
import Anthropic from "@anthropic-ai/sdk";
import { storage } from "./storage";
import type { Agent, AgentTask } from "@shared/schema";

// ---- WebSocket broadcast (injected from routes.ts) ----
let broadcast: ((event: string, data: unknown) => void) | null = null;

export function setAgentBroadcast(fn: (event: string, data: unknown) => void) {
  broadcast = fn;
}

function emit(event: string, data: unknown) {
  if (broadcast) broadcast(event, data);
}

// ---- Agent scheduler — polls queued tasks for online agents ----
const agentTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

/**
 * Start periodic task processing for the given agent.
 * Safe to call multiple times — won't double-start.
 */
export function startAgentScheduler(userId: string, agentId: string) {
  const key = `${userId}:${agentId}`;
  if (agentTimers.has(key)) return;

  const timer = setInterval(() => {
    processAgentQueue(userId, agentId);
  }, 10000); // Check every 10 seconds

  agentTimers.set(key, timer);
}

/**
 * Stop task processing for the given agent.
 */
export function stopAgentScheduler(userId: string, agentId: string) {
  const key = `${userId}:${agentId}`;
  const timer = agentTimers.get(key);
  if (timer) {
    clearInterval(timer);
    agentTimers.delete(key);
  }
}

/**
 * Process the next queued task for the given agent.
 * If no tasks are queued or the agent is not online, does nothing.
 */
async function processAgentQueue(userId: string, agentId: string) {
  const agent = storage.getAgent(userId, agentId);
  if (!agent || agent.status !== "online") return;

  const tasks = storage.getAgentTasks(userId, agentId);
  const queued = tasks.find(t => t.status === "queued");
  if (!queued) return;

  // Mark as running
  storage.updateAgentTask(userId, queued.id, {
    status: "running",
    startedAt: new Date().toISOString(),
  });
  storage.updateAgent(userId, agentId, { status: "busy" });
  emit("agent:task", { agentId, taskId: queued.id, status: "running" });

  try {
    // Get the user's Claude config for API key
    const claudeConfig = storage.getClaudeCodeConfigRaw(userId);

    if (claudeConfig?.apiKey) {
      const client = new Anthropic({ apiKey: claudeConfig.apiKey });

      const response = await client.messages.create({
        model: (agent as any).model || "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: `You are agent "${agent.name}" in the ZeroClaw platform. Your skills: ${(agent as any).skills?.join(", ") || "general"}. Execute the assigned task concisely.`,
        messages: [{ role: "user", content: `Task: ${queued.title}\n\nDescription: ${queued.description || ""}` }],
      });

      const result = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map(b => b.text)
        .join("\n");

      storage.updateAgentTask(userId, queued.id, {
        status: "completed",
        completedAt: new Date().toISOString(),
      });

      // Store result as a notification
      storage.addNotification(userId, {
        type: "agent",
        title: `Agent "${agent.name}" completed task`,
        message: result.slice(0, 200),
        link: "#/agents",
      });

    } else {
      // No API key — mark task as failed
      storage.updateAgentTask(userId, queued.id, {
        status: "failed",
        completedAt: new Date().toISOString(),
      });
      storage.addNotification(userId, {
        type: "agent",
        title: `Agent "${agent.name}" failed`,
        message: "No API key configured. Connect an Anthropic API key in Claude Code settings.",
        link: "#/claude-code",
      });
    }
  } catch (err: any) {
    storage.updateAgentTask(userId, queued.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
    });
    storage.addNotification(userId, {
      type: "agent",
      title: `Agent "${agent.name}" failed`,
      message: err?.message || "Task execution failed",
      link: "#/agents",
    });
  }

  // Return agent to online
  const freshAgent = storage.getAgent(userId, agentId);
  storage.updateAgent(userId, agentId, {
    status: "online",
    tasksCompleted: ((freshAgent as any)?.tasksCompleted || 0) + 1,
  });
  emit("agent:task", { agentId, taskId: queued.id, status: "completed" });
}

/**
 * Execute a single task immediately (on-demand execution).
 */
export async function executeAgentTask(userId: string, agentId: string, taskId: string) {
  // Queue the task for processing
  await processAgentQueue(userId, agentId);
}
