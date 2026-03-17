import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import session from "express-session";
import MemoryStoreFactory from "memorystore";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { saveResetToken, validateResetToken, markResetTokenUsed } from "./db";
import { storage } from "./storage";
import { rateLimitMiddleware, checkTierLimit } from "./rate-limit";
import { setBroadcast, executePipeline, cancelPipelineExecution, rerunPipeline } from "./engine";
import { openclawBridge } from "./openclaw-bridge";
import {
  insertPipelineSchema,
  insertAgentSchema,
  insertWorkflowSchema,
  insertDeploymentSchema,
  updateOpenClawConfigSchema,
  insertPlanSchema,
  updatePlanSchema,
  insertApiKeySchema,
  updateDashboardSettingsSchema,
  insertSecretSchema,
  insertWebhookConfigSchema,
  insertAgentTaskSchema,
  registerSchema,
  loginSchema,
  PRICING_TIERS,
} from "@shared/schema";

// Session type augmentation
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// Password hashing — bcrypt with 12 salt rounds
const BCRYPT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  return bcrypt.compare(password, stored);
}

// Password strength validation
function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must include a number";
  return null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = storage.getUserById(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

function analyzeMarkdownIntoPhases(markdown: string): Array<{ id: string; title: string; tasks: string[] }> {
  const phases: Array<{ id: string; title: string; tasks: string[] }> = [];
  const lines = markdown.split("\n");

  // Strategy 1: Look for explicit ## headings
  const h2Regex = /^##\s+(.+)/;
  let currentPhase: { title: string; tasks: string[] } | null = null;

  for (const line of lines) {
    const h2Match = line.match(h2Regex);
    if (h2Match) {
      if (currentPhase) {
        phases.push({
          id: `phase-${phases.length + 1}`,
          title: currentPhase.title,
          tasks: currentPhase.tasks,
        });
      }
      let title = h2Match[1].trim();
      title = title.replace(/^Phase\s+\d+:\s*/i, "");
      currentPhase = { title, tasks: [] };
    } else if (currentPhase) {
      const taskMatch = line.match(/^[-*]\s+(?:\[[ x]\]\s+)?(.+)/i);
      if (taskMatch) {
        currentPhase.tasks.push(taskMatch[1].trim());
      }
    }
  }
  if (currentPhase) {
    phases.push({
      id: `phase-${phases.length + 1}`,
      title: currentPhase.title,
      tasks: currentPhase.tasks,
    });
  }

  // Strategy 2: If no ## headings found, try # headings
  if (phases.length === 0) {
    const h1Regex = /^#\s+(.+)/;
    currentPhase = null;
    for (const line of lines) {
      const h1Match = line.match(h1Regex);
      if (h1Match) {
        if (currentPhase) {
          phases.push({
            id: `phase-${phases.length + 1}`,
            title: currentPhase.title,
            tasks: currentPhase.tasks,
          });
        }
        currentPhase = { title: h1Match[1].trim(), tasks: [] };
      } else if (currentPhase) {
        const taskMatch = line.match(/^[-*]\s+(?:\[[ x]\]\s+)?(.+)/i);
        if (taskMatch) {
          currentPhase.tasks.push(taskMatch[1].trim());
        }
      }
    }
    if (currentPhase) {
      phases.push({
        id: `phase-${phases.length + 1}`,
        title: currentPhase.title,
        tasks: currentPhase.tasks,
      });
    }
  }

  // Strategy 3: Try numbered lists or step/phase patterns
  if (phases.length === 0) {
    let currentItem: { title: string; tasks: string[] } | null = null;
    const numberedItems: Array<{ title: string; tasks: string[] }> = [];

    for (const line of lines) {
      const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)/);
      const stepMatch = line.match(/^(?:step|phase|stage)\s+\d+[.:]\s*(.+)/i);

      if (numberedMatch || stepMatch) {
        if (currentItem) numberedItems.push(currentItem);
        currentItem = { title: (numberedMatch?.[2] || stepMatch?.[1] || "").trim(), tasks: [] };
      } else if (currentItem) {
        const subItem = line.match(/^\s+[-*]\s+(.+)/);
        if (subItem) currentItem.tasks.push(subItem[1].trim());
      }
    }
    if (currentItem) numberedItems.push(currentItem);

    numberedItems.forEach((item, i) => {
      phases.push({ id: `phase-${i + 1}`, title: item.title, tasks: item.tasks });
    });
  }

  // Strategy 4: Last resort — split into paragraphs
  if (phases.length === 0) {
    const paragraphs = markdown.split(/\n\n+/).filter(p => p.trim().length > 10);
    paragraphs.forEach((p, i) => {
      const firstLine = p.split("\n")[0].replace(/^[#*_\->\s]+/, "").trim();
      const title = firstLine.length > 60 ? firstLine.substring(0, 57) + "..." : firstLine;
      const tasks = p.split("\n").slice(1)
        .map(l => l.replace(/^[-*>\s]+/, "").trim())
        .filter(l => l.length > 3);
      phases.push({ id: `phase-${i + 1}`, title: title || `Phase ${i + 1}`, tasks });
    });
  }

  return phases;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ========================================
  // Session middleware
  // ========================================
  let sessionStore: session.Store;
  if (pool) {
    const PgStore = connectPgSimple(session);
    sessionStore = new PgStore({
      pool: pool,
      tableName: "session",
      createTableIfMissing: true,
    });
    console.log("[session] Using PostgreSQL session store");
  } else {
    const MemoryStore = MemoryStoreFactory(session);
    sessionStore = new MemoryStore({ checkPeriod: 86400000 });
    console.log("[session] Using in-memory session store");
  }

  app.use(session({
    secret: process.env.SESSION_SECRET || randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
    },
  }));

  // ========================================
  // WebSocket setup
  // ========================================
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Wire broadcast from engine → all WS clients
  setBroadcast((event: string, data: unknown) => {
    const message = JSON.stringify({ event, data });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ event: "connected", data: { message: "OpenClaw WebSocket connected" } }));
  });

  // ========================================
  // Auth endpoints (no requireAuth)
  // ========================================
  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      }
      const { email, username, password } = parsed.data;

      // Password strength check
      const strengthError = validatePasswordStrength(password);
      if (strengthError) {
        return res.status(400).json({ error: strengthError });
      }

      if (storage.getUserByEmail(email)) {
        return res.status(400).json({ error: "Email already registered" });
      }
      const passwordHash = await hashPassword(password);
      const user = storage.createUser({ email, username, passwordHash });
      req.session.userId = user.id;
      res.status(201).json({ id: user.id, email: user.email, username: user.username, role: user.role, tier: user.tier, onboarding: user.onboarding });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      }
      const { email, password } = parsed.data;
      const user = storage.getUserByEmail(email);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      if (user.suspended) {
        return res.status(403).json({ error: "Account suspended" });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, username: user.username, role: user.role, tier: user.tier, onboarding: user.onboarding });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({ id: user.id, email: user.email, username: user.username, role: user.role, tier: user.tier, onboarding: user.onboarding });
  });

  // ========================================
  // Password Reset
  // ========================================
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      // Always return success (don't reveal whether email exists)
      const user = storage.getUserByEmail(email);
      if (user && pool) {
        const rawToken = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(rawToken).digest("hex");
        const tokenId = `rst-${randomBytes(4).toString("hex")}`;
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

        await saveResetToken(tokenId, user.id, tokenHash, expiresAt);

        // In production, this would send an email. For now, log and return the token.
        console.log(`[auth] Password reset token for ${email}: ${rawToken}`);
        // Return the token in the response for now (no email service yet)
        return res.json({ message: "Password reset token generated", resetToken: rawToken });
      }

      res.json({ message: "If an account exists with that email, a reset link has been generated" });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ error: "Token and password are required" });

      const strengthError = validatePasswordStrength(password);
      if (strengthError) return res.status(400).json({ error: strengthError });

      if (!pool) return res.status(500).json({ error: "Database not available" });

      const tokenHash = createHash("sha256").update(token).digest("hex");
      const userId = await validateResetToken(tokenHash);
      if (!userId) return res.status(400).json({ error: "Invalid or expired reset token" });

      const user = storage.getUserById(userId);
      if (!user) return res.status(400).json({ error: "User not found" });

      // Update password in memory
      user.passwordHash = await hashPassword(password);

      // Persist to DB via the write-through
      const { persistUser } = await import("./db");
      await persistUser(user);

      // Mark token as used
      await markResetTokenUsed(tokenHash);

      res.json({ message: "Password has been reset. You can now log in." });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========================================
  // All routes below require auth
  // ========================================
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    // Skip auth routes
    if (req.path.startsWith("/auth/")) return next();
    if (req.path === "/health") return next();
    requireAuth(req, res, next);
  });

  // Rate limiting — applied after auth so we have userId
  // Exempt read-only endpoints that the UI polls frequently
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/auth/")) return next();
    if (req.path === "/health") return next();
    if (req.path === "/pricing") return next();
    // Exempt GET requests on status/settings endpoints (UI polling)
    if (req.method === "GET" && ["/subscription", "/usage", "/stats", "/activity", "/onboarding", "/settings", "/notifications", "/openclaw/status"].includes(req.path)) return next();
    rateLimitMiddleware(req, res, next);
  });

  // ========================================
  // Health
  // ========================================
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ========================================
  // Dashboard Stats (computed from real data)
  // ========================================
  app.get("/api/stats", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getStats(userId));
  });

  // ========================================
  // Activity Feed
  // ========================================
  app.get("/api/activity", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getActivity(userId));
  });

  // ========================================
  // Pipelines CRUD
  // ========================================
  app.get("/api/pipelines", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getPipelines(userId));
  });

  app.get("/api/pipelines/:id", (req, res) => {
    const userId = req.session.userId!;
    const pipeline = storage.getPipeline(userId, req.params.id);
    if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });
    res.json(pipeline);
  });

  app.post("/api/pipelines", (req, res) => {
    const userId = req.session.userId!;
    // Check tier limit
    const limitCheck = checkTierLimit(userId, "pipelines", storage.getPipelines(userId).length);
    if (!limitCheck.allowed) {
      return res.status(403).json({ error: limitCheck.message, tier: limitCheck.tier, limit: limitCheck.limit });
    }
    const parsed = insertPipelineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const pipeline = storage.createPipeline(userId, parsed.data);
    executePipeline(pipeline, userId);
    res.status(201).json(pipeline);
  });

  // Cancel a running pipeline
  app.post("/api/pipelines/:id/cancel", (req, res) => {
    const userId = req.session.userId!;
    const pipeline = storage.getPipeline(userId, req.params.id);
    if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });
    cancelPipelineExecution(pipeline.id, userId);
    res.json({ ok: true, pipeline: storage.getPipeline(userId, pipeline.id) });
  });

  // Rerun a pipeline (creates a new pipeline with same config)
  app.post("/api/pipelines/:id/rerun", (req, res) => {
    const userId = req.session.userId!;
    const newPipeline = rerunPipeline(req.params.id, userId);
    if (!newPipeline) return res.status(404).json({ error: "Pipeline not found" });
    res.status(201).json(newPipeline);
  });

  app.patch("/api/pipelines/:id/status", (req, res) => {
    const userId = req.session.userId!;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required" });
    const pipeline = storage.updatePipelineStatus(userId, req.params.id, status);
    if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });
    res.json(pipeline);
  });

  app.delete("/api/pipelines/:id", (req, res) => {
    const userId = req.session.userId!;
    const deleted = storage.deletePipeline(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Pipeline not found" });
    res.json({ ok: true });
  });

  // ========================================
  // Agents CRUD
  // ========================================
  app.get("/api/agents", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getAgents(userId));
  });

  app.get("/api/agents/:id", (req, res) => {
    const userId = req.session.userId!;
    const agent = storage.getAgent(userId, req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  });

  app.post("/api/agents", (req, res) => {
    const userId = req.session.userId!;
    // Check tier limit
    const limitCheck = checkTierLimit(userId, "agents", storage.getAgents(userId).length);
    if (!limitCheck.allowed) {
      return res.status(403).json({ error: limitCheck.message, tier: limitCheck.tier, limit: limitCheck.limit });
    }
    const parsed = insertAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const agent = storage.createAgent(userId, parsed.data);
    res.status(201).json(agent);
  });

  app.patch("/api/agents/:id", (req, res) => {
    const userId = req.session.userId!;
    const agent = storage.updateAgent(userId, req.params.id, req.body);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    res.json(agent);
  });

  // Ping agent (simulate heartbeat check)
  app.post("/api/agents/:id/ping", (req, res) => {
    const userId = req.session.userId!;
    const agent = storage.getAgent(userId, req.params.id);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const wasOffline = agent.status === "offline" || agent.status === "error";
    const updated = storage.updateAgent(userId, req.params.id, {
      lastHeartbeat: new Date().toISOString(),
      status: wasOffline ? "online" : agent.status,
    });
    res.json(updated);
  });

  app.delete("/api/agents/:id", (req, res) => {
    const userId = req.session.userId!;
    const deleted = storage.deleteAgent(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Agent not found" });
    res.json({ ok: true });
  });

  // ========================================
  // Workflows CRUD
  // ========================================
  app.get("/api/workflows", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getWorkflows(userId));
  });

  app.get("/api/workflows/:id", (req, res) => {
    const userId = req.session.userId!;
    const workflow = storage.getWorkflow(userId, req.params.id);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    res.json(workflow);
  });

  app.post("/api/workflows", (req, res) => {
    const userId = req.session.userId!;
    // Check tier limit
    const limitCheck = checkTierLimit(userId, "workflows", storage.getWorkflows(userId).length);
    if (!limitCheck.allowed) {
      return res.status(403).json({ error: limitCheck.message, tier: limitCheck.tier, limit: limitCheck.limit });
    }
    const parsed = insertWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const workflow = storage.createWorkflow(userId, parsed.data);
    res.status(201).json(workflow);
  });

  app.patch("/api/workflows/:id", (req, res) => {
    const userId = req.session.userId!;
    const workflow = storage.updateWorkflow(userId, req.params.id, req.body);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });
    res.json(workflow);
  });

  app.delete("/api/workflows/:id", (req, res) => {
    const userId = req.session.userId!;
    const deleted = storage.deleteWorkflow(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Workflow not found" });
    res.json({ ok: true });
  });

  // Run workflow (creates a new pipeline from workflow definition)
  app.post("/api/workflows/:id/run", (req, res) => {
    const userId = req.session.userId!;
    const workflow = storage.getWorkflow(userId, req.params.id);
    if (!workflow) return res.status(404).json({ error: "Workflow not found" });

    const steps = workflow.nodes
      .filter((n) => n.type !== "trigger")
      .map((n) => ({
        name: n.label,
        type: (n.type === "deploy" ? "deploy" : n.type === "openclaw" ? "openclaw" : "build") as any,
      }));

    const pipeline = storage.createPipeline(userId, {
      name: `${workflow.name} #${workflow.totalRuns + 1}`,
      description: `Auto-triggered from workflow: ${workflow.name}`,
      branch: "main",
      commit: "",
      author: "workflow-runner",
      steps,
      envVars: {},
    });

    executePipeline(pipeline, userId);

    storage.updateWorkflow(userId, workflow.id, {
      ...workflow,
    });
    const updated = storage.getWorkflow(userId, workflow.id);
    if (updated) {
      (updated as any).lastRun = new Date().toISOString();
      (updated as any).totalRuns += 1;
      (updated as any).status = "running";
    }

    res.json({ workflow: updated, pipeline });
  });

  // ========================================
  // Deployments CRUD
  // ========================================
  app.get("/api/deployments", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getDeployments(userId));
  });

  app.get("/api/deployments/:id", (req, res) => {
    const userId = req.session.userId!;
    const deployment = storage.getDeployment(userId, req.params.id);
    if (!deployment) return res.status(404).json({ error: "Deployment not found" });
    res.json(deployment);
  });

  app.post("/api/deployments", (req, res) => {
    const userId = req.session.userId!;
    const parsed = insertDeploymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const deployment = storage.createDeployment(userId, parsed.data);
    res.status(201).json(deployment);
  });

  // ========================================
  // OpenClaw Configuration & Gateway
  // ========================================
  app.get("/api/openclaw/config", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getOpenClawConfig(userId));
  });

  app.patch("/api/openclaw/config", (req, res) => {
    const userId = req.session.userId!;
    const parsed = updateOpenClawConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const config = storage.updateOpenClawConfig(userId, parsed.data);
    res.json(config);
  });

  // Test connection to OpenClaw gateway
  app.post("/api/openclaw/test-connection", async (req, res) => {
    const userId = req.session.userId!;
    const config = storage.getOpenClawConfig(userId);
    const url = `${config.gatewayUrl}:${config.gatewayPort}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const start = Date.now();
      const response = await fetch(url, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeout);
      const latency = Date.now() - start;

      if (response && response.ok) {
        storage.setOpenClawConnected(userId, true);
        // Also start the WebSocket bridge
        openclawBridge.connect(userId, config.gatewayUrl, config.gatewayPort, {
          heartbeatInterval: config.heartbeatInterval,
          autoReconnect: config.autoReconnect,
        });
        res.json({ connected: true, message: `Connected to ${url}`, latency: `${latency}ms` });
      } else {
        storage.setOpenClawConnected(userId, false);
        res.json({ connected: false, message: `Unable to reach ${url}` });
      }
    } catch {
      storage.setOpenClawConnected(userId, false);
      res.json({ connected: false, message: `Connection failed: ${url}` });
    }
  });

  // Get gateway status (real-time check, combines config + bridge status)
  app.get("/api/openclaw/status", (req, res) => {
    const userId = req.session.userId!;
    const config = storage.getOpenClawConfig(userId);
    const bridgeStatus = openclawBridge.getStatus(userId);

    res.json({
      connected: config.connected || bridgeStatus.connected,
      gatewayUrl: `${config.gatewayUrl}:${config.gatewayPort}`,
      model: config.model,
      latency: bridgeStatus.latency,
      lastHeartbeat: bridgeStatus.lastHeartbeat || new Date().toISOString(),
      error: bridgeStatus.error,
      reconnectAttempts: bridgeStatus.reconnectAttempts,
    });
  });

  // Bridge: connect WebSocket to OpenClaw gateway
  app.post("/api/openclaw/connect", (req, res) => {
    const userId = req.session.userId!;
    const { gatewayUrl, port } = req.body;
    const config = storage.getOpenClawConfig(userId);

    const url = gatewayUrl || config.gatewayUrl;
    const p = port || config.gatewayPort;

    openclawBridge.connect(userId, url, p, {
      heartbeatInterval: config.heartbeatInterval,
      autoReconnect: config.autoReconnect,
    });
    storage.setOpenClawConnected(userId, true);

    res.json({ ok: true, message: `Connecting to ${url}:${p}` });
  });

  // Bridge: disconnect WebSocket
  app.post("/api/openclaw/disconnect", (req, res) => {
    const userId = req.session.userId!;
    openclawBridge.disconnect(userId);
    storage.setOpenClawConnected(userId, false);
    res.json({ ok: true, message: "Disconnected" });
  });

  // Bridge: send command through WebSocket
  app.post("/api/openclaw/command", (req, res) => {
    const userId = req.session.userId!;
    const { command, payload } = req.body;

    if (!command) {
      return res.status(400).json({ error: "Command is required" });
    }

    const result = openclawBridge.sendCommand(userId, command, payload);
    if (result.ok) {
      res.json({ ok: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  });

  // ========================================
  // Plans CRUD
  // ========================================
  app.get("/api/plans", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getPlans(userId));
  });

  app.get("/api/plans/templates", (_req, res) => {
    res.json(storage.getPlanTemplates());
  });

  app.get("/api/plans/:id", (req, res) => {
    const userId = req.session.userId!;
    const plan = storage.getPlan(userId, req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json(plan);
  });

  app.post("/api/plans", (req, res) => {
    const userId = req.session.userId!;
    const parsed = insertPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const plan = storage.createPlan(userId, parsed.data);
    res.status(201).json(plan);
  });

  app.patch("/api/plans/:id", (req, res) => {
    const userId = req.session.userId!;
    const parsed = updatePlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const plan = storage.updatePlan(userId, req.params.id, parsed.data);
    if (!plan) return res.status(404).json({ error: "Plan not found" });
    res.json(plan);
  });

  app.delete("/api/plans/:id", (req, res) => {
    const userId = req.session.userId!;
    const deleted = storage.deletePlan(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Plan not found" });
    res.json({ ok: true });
  });

  // Launch a pipeline from a plan phase
  app.post("/api/plans/:id/phases/:phaseId/launch", (req, res) => {
    const userId = req.session.userId!;
    const plan = storage.getPlan(userId, req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const phase = plan.phases.find((p) => p.id === req.params.phaseId);
    if (!phase) return res.status(404).json({ error: "Phase not found" });

    if (!phase.workflowId) return res.status(400).json({ error: "No workflow assigned to this phase" });

    const workflow = storage.getWorkflow(userId, phase.workflowId);
    if (!workflow) return res.status(404).json({ error: "Assigned workflow not found" });

    const steps = workflow.nodes
      .filter((n) => n.type !== "trigger")
      .map((n) => ({
        name: n.label,
        type: (n.type === "deploy" ? "deploy" : n.type === "openclaw" ? "openclaw" : "build") as any,
      }));

    const pipeline = storage.createPipeline(userId, {
      name: `${plan.title} — ${phase.title}`,
      description: `Plan phase: ${phase.title} (workflow: ${workflow.name})`,
      branch: "main",
      commit: "",
      author: "planner",
      steps,
      envVars: {},
    });

    executePipeline(pipeline, userId);

    phase.pipelineId = pipeline.id;
    phase.pipelineStatus = "running";
    storage.updatePlan(userId, plan.id, { phases: plan.phases, status: "in_progress" });

    res.json({ plan, pipeline });
  });

  // Analyze a plan into phases using OpenClaw or builtin parser
  app.post("/api/plans/:id/analyze", async (req, res) => {
    const userId = req.session.userId!;
    const plan = storage.getPlan(userId, req.params.id);
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const markdown = plan.markdown;
    if (!markdown.trim()) return res.status(400).json({ error: "Plan has no content to analyze" });

    const config = storage.getOpenClawConfig(userId);
    const gatewayUrl = `${config.gatewayUrl}:${config.gatewayPort}`;

    let phases: Array<{ id: string; title: string; tasks: string[] }> = [];
    let source: "openclaw" | "builtin" = "builtin";

    // Try OpenClaw gateway first
    if (config.connected) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${gatewayUrl}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "plan_analysis",
            content: markdown,
            instructions: "Break this plan down into sequential phases. Each phase should have a title and a list of concrete tasks. Return JSON array: [{title: string, tasks: string[]}]"
          }),
          signal: controller.signal,
        }).catch(() => null);
        clearTimeout(timeout);

        if (response && response.ok) {
          const data = await response.json().catch(() => null);
          if (data && Array.isArray(data.phases)) {
            phases = data.phases.map((p: any, i: number) => ({
              id: `phase-${i + 1}`,
              title: p.title || `Phase ${i + 1}`,
              tasks: Array.isArray(p.tasks) ? p.tasks : [],
            }));
            source = "openclaw";
          }
        }
      } catch {
        // Fall through to builtin
      }
    }

    // Builtin intelligent fallback
    if (phases.length === 0) {
      phases = analyzeMarkdownIntoPhases(markdown);
      source = "builtin";
    }

    // Preserve existing workflow/pipeline assignments where phase IDs match
    const existingPhases = plan.phases || [];
    const mergedPhases = phases.map((p) => {
      const existing = existingPhases.find((ep) => ep.id === p.id);
      return {
        ...p,
        workflowId: existing?.workflowId,
        pipelineId: existing?.pipelineId,
        pipelineStatus: existing?.pipelineStatus,
      };
    });

    const updated = storage.updatePlan(userId, plan.id, { phases: mergedPhases });

    storage.addAuditLog(userId, {
      action: "execute",
      resource: "plan",
      resourceId: plan.id,
      resourceName: plan.title,
      details: `Analyzed plan into ${phases.length} phases (source: ${source})`,
      user: "user",
    });

    res.json({ phases: mergedPhases, source, plan: updated });
  });

  // ========================================
  // API Key Management
  // ========================================
  app.get("/api/auth/status", (req, res) => {
    const userId = req.session.userId!;
    res.json({
      enabled: storage.isAuthEnabled(userId),
      keyCount: storage.getApiKeys(userId).length,
    });
  });

  app.post("/api/auth/toggle", (req, res) => {
    const userId = req.session.userId!;
    const { enabled } = req.body;
    storage.setAuthEnabled(userId, !!enabled);
    res.json({ enabled: storage.isAuthEnabled(userId) });
  });

  app.get("/api/auth/keys", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getApiKeys(userId));
  });

  app.post("/api/auth/keys", (req, res) => {
    const userId = req.session.userId!;
    const parsed = insertApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const result = storage.createApiKey(userId, parsed.data);
    res.status(201).json({ ...result.apiKey, rawKey: result.rawKey });
  });

  app.delete("/api/auth/keys/:id", (req, res) => {
    const userId = req.session.userId!;
    const deleted = storage.deleteApiKey(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "API key not found" });
    res.json({ ok: true });
  });

  // ========================================
  // Dashboard Settings
  // ========================================
  app.get("/api/settings", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getDashboardSettings(userId));
  });

  app.patch("/api/settings", (req, res) => {
    const userId = req.session.userId!;
    const parsed = updateDashboardSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const settings = storage.updateDashboardSettings(userId, parsed.data);
    res.json(settings);
  });

  // ========================================
  // Notifications
  // ========================================
  app.get("/api/notifications", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getNotifications(userId));
  });

  app.post("/api/notifications/read", (req, res) => {
    const userId = req.session.userId!;
    storage.markAllRead(userId);
    res.json({ ok: true });
  });

  app.delete("/api/notifications", (req, res) => {
    const userId = req.session.userId!;
    storage.clearNotifications(userId);
    res.json({ ok: true });
  });

  // ========================================
  // Search
  // ========================================
  app.get("/api/search", (req: Request, res: Response) => {
    const userId = req.session.userId!;
    const q = (req.query.q as string || "").toLowerCase().trim();
    if (!q) {
      return res.json({ pipelines: [], workflows: [], agents: [], deployments: [] });
    }

    const pipelines = storage.getPipelines(userId).filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.branch.toLowerCase().includes(q)
    );

    const workflows = storage.getWorkflows(userId).filter((w) =>
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q)
    );

    const agents = storage.getAgents(userId).filter((a) =>
      a.name.toLowerCase().includes(q) ||
      a.model.toLowerCase().includes(q)
    );

    const deployments = storage.getDeployments(userId).filter((d) =>
      d.pipelineName.toLowerCase().includes(q) ||
      d.environment.toLowerCase().includes(q)
    );

    res.json({ pipelines, workflows, agents, deployments });
  });

  // ========================================
  // Gateway Proxy
  // ========================================

  function broadcastGatewayEvent(event: string, data: unknown) {
    const message = JSON.stringify({ event, data });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  app.post("/api/openclaw/gateway/send", async (req, res) => {
    const userId = req.session.userId!;
    const config = storage.getOpenClawConfig(userId);
    const url = `${config.gatewayUrl}:${config.gatewayPort}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${url}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      if (response && response.ok) {
        const data = await response.json().catch(() => ({}));
        broadcastGatewayEvent("gateway:response", { message: req.body, response: data });
        res.json({ ok: true, data });
      } else {
        broadcastGatewayEvent("gateway:error", { message: `Failed to send to ${url}`, statusCode: response?.status });
        res.status(502).json({ error: `Gateway returned ${response?.status || "no response"}` });
      }
    } catch (err: any) {
      broadcastGatewayEvent("gateway:error", { message: err.message });
      res.status(504).json({ error: `Gateway timeout or unreachable: ${err.message}` });
    }
  });

  app.get("/api/openclaw/gateway/health", async (req, res) => {
    const userId = req.session.userId!;
    const config = storage.getOpenClawConfig(userId);
    const url = `${config.gatewayUrl}:${config.gatewayPort}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const start = Date.now();

      const response = await fetch(`${url}/health`, {
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      const latency = Date.now() - start;

      if (response && response.ok) {
        const data = await response.json().catch(() => ({}));
        storage.setOpenClawConnected(userId, true);
        const result = { status: "healthy", latency: `${latency}ms`, gateway: url, data };
        broadcastGatewayEvent("gateway:health", result);
        res.json(result);
      } else {
        storage.setOpenClawConnected(userId, false);
        const result = { status: "unhealthy", gateway: url, statusCode: response?.status || null };
        broadcastGatewayEvent("gateway:health", result);
        res.json(result);
      }
    } catch (err: any) {
      storage.setOpenClawConnected(userId, false);
      const result = { status: "unreachable", gateway: url, error: err.message };
      broadcastGatewayEvent("gateway:error", result);
      res.json(result);
    }
  });

  app.post("/api/openclaw/gateway/command", async (req, res) => {
    const userId = req.session.userId!;
    const config = storage.getOpenClawConfig(userId);
    const url = `${config.gatewayUrl}:${config.gatewayPort}`;
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({ error: "Command is required" });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${url}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      if (response && response.ok) {
        const data = await response.json().catch(() => ({}));
        broadcastGatewayEvent("gateway:response", { command, response: data });
        res.json({ ok: true, data });
      } else {
        broadcastGatewayEvent("gateway:error", { command, message: `Gateway returned ${response?.status || "no response"}` });
        res.status(502).json({ error: `Gateway returned ${response?.status || "no response"}` });
      }
    } catch (err: any) {
      broadcastGatewayEvent("gateway:error", { command, message: err.message });
      res.status(504).json({ error: `Gateway timeout or unreachable: ${err.message}` });
    }
  });

  // ========================================
  // GitHub Actions Integration
  // ========================================
  app.get("/api/github/status", (_req, res) => {
    const token = process.env.GITHUB_TOKEN;
    res.json({
      configured: !!token,
      message: token ? "GitHub token configured" : "Set GITHUB_TOKEN environment variable to enable GitHub Actions integration",
    });
  });

  app.get("/api/github/repos", async (_req, res) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(200).json({ repos: [], message: "GITHUB_TOKEN not set" });
    }
    try {
      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=20", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
      });
      if (!response.ok) {
        return res.status(200).json({ repos: [], message: "GitHub API error" });
      }
      const repos = await response.json();
      res.json({ repos: repos.map((r: any) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        html_url: r.html_url,
        default_branch: r.default_branch,
      }))});
    } catch {
      res.status(200).json({ repos: [], message: "Failed to fetch repos" });
    }
  });

  app.get("/api/github/repos/:owner/:repo/runs", async (req, res) => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(200).json({ runs: [], message: "GITHUB_TOKEN not set" });
    }
    try {
      const { owner, repo } = req.params;
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" } }
      );
      if (!response.ok) {
        return res.status(200).json({ runs: [], message: "GitHub API error" });
      }
      const data = await response.json();
      res.json({ runs: (data.workflow_runs || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
        created_at: r.created_at,
        html_url: r.html_url,
        head_branch: r.head_branch,
        head_sha: r.head_sha?.slice(0, 7),
      }))});
    } catch {
      res.status(200).json({ runs: [], message: "Failed to fetch runs" });
    }
  });

  app.post("/api/github/repos/:owner/:repo/dispatch", async (req, res) => {
    const userId = req.session.userId!;
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return res.status(400).json({ error: "GITHUB_TOKEN not set" });
    }
    try {
      const { owner, repo } = req.params;
      const { workflow_id, ref } = req.body;

      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: ref || "main" }),
        }
      );

      if (response.status === 204) {
        storage.addActivity(userId, { type: "pipeline", message: `GitHub Actions workflow triggered on ${owner}/${repo}`, status: "running" } as any);
        res.json({ ok: true, message: "Workflow dispatch triggered" });
      } else {
        const text = await response.text();
        res.status(response.status).json({ error: text });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ========================================
  // Secrets CRUD
  // ========================================
  app.get("/api/secrets", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getSecrets(userId));
  });

  app.post("/api/secrets", (req, res) => {
    const userId = req.session.userId!;
    const parsed = insertSecretSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { secret, rawValue } = storage.createSecret(userId, parsed.data);
    res.json({ secret, rawValue });
  });

  app.delete("/api/secrets/:id", (req, res) => {
    const userId = req.session.userId!;
    const deleted = storage.deleteSecret(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Secret not found" });
    res.json({ ok: true });
  });

  // ========================================
  // Webhooks CRUD
  // ========================================
  app.get("/api/webhooks", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getWebhooks(userId));
  });

  app.post("/api/webhooks", (req, res) => {
    const userId = req.session.userId!;
    const parsed = insertWebhookConfigSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const webhook = storage.createWebhook(userId, parsed.data);
    res.json(webhook);
  });

  app.patch("/api/webhooks/:id", (req, res) => {
    const userId = req.session.userId!;
    const updated = storage.updateWebhook(userId, req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Webhook not found" });
    res.json(updated);
  });

  app.delete("/api/webhooks/:id", (req, res) => {
    const userId = req.session.userId!;
    const deleted = storage.deleteWebhook(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Webhook not found" });
    res.json({ ok: true });
  });

  // Incoming GitHub webhook endpoint (no auth — external)
  app.post("/api/webhooks/github", (req, res) => {
    // Webhooks from GitHub are external — we process for all users that have matching webhooks
    // For MVP, this is a simplified handler
    const event = req.headers["x-github-event"] as string || "push";
    const payload = req.body;
    const branch = payload?.ref?.replace("refs/heads/", "") || payload?.pull_request?.head?.ref || "main";

    res.json({ event, branch, triggered: [], matchedCount: 0, note: "External webhook processing — per-user scoping in future" });
  });

  // ========================================
  // Pipeline Artifacts
  // ========================================
  app.get("/api/pipelines/:id/artifacts", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getArtifacts(userId, req.params.id));
  });

  // ========================================
  // Agent Tasks CRUD
  // ========================================
  app.get("/api/agent-tasks", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getAgentTasks(userId));
  });

  app.get("/api/agents/:id/tasks", (req, res) => {
    const userId = req.session.userId!;
    res.json(storage.getAgentTasks(userId, req.params.id));
  });

  app.post("/api/agent-tasks", (req, res) => {
    const userId = req.session.userId!;
    const parsed = insertAgentTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const task = storage.createAgentTask(userId, parsed.data);
    res.json(task);
  });

  app.patch("/api/agent-tasks/:id", (req, res) => {
    const userId = req.session.userId!;
    const updated = storage.updateAgentTask(userId, req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Task not found" });
    res.json(updated);
  });

  app.delete("/api/agent-tasks/:id", (req, res) => {
    const userId = req.session.userId!;
    const deleted = storage.deleteAgentTask(userId, req.params.id);
    if (!deleted) return res.status(404).json({ error: "Task not found" });
    res.json({ ok: true });
  });

  // ========================================
  // Pipeline Env Vars
  // ========================================
  app.patch("/api/pipelines/:id/env", (req, res) => {
    const userId = req.session.userId!;
    const pipeline = storage.getPipeline(userId, req.params.id);
    if (!pipeline) return res.status(404).json({ error: "Pipeline not found" });
    pipeline.envVars = req.body.envVars || {};
    res.json(pipeline);
  });

  // ========================================
  // Pipeline Templates (global)
  // ========================================
  app.get("/api/pipeline-templates", (_req, res) => {
    res.json(storage.getPipelineTemplates());
  });

  // ========================================
  // Deployment Rollback
  // ========================================
  app.post("/api/deployments/:id/rollback", (req, res) => {
    const userId = req.session.userId!;
    const deployment = storage.getDeployment(userId, req.params.id);
    if (!deployment) return res.status(404).json({ error: "Deployment not found" });

    const rollback = storage.createDeployment(userId, {
      pipelineId: deployment.pipelineId,
      environment: deployment.environment,
      version: deployment.version + "-rollback",
      deployedBy: "rollback",
      url: deployment.url,
    });

    (rollback as any).rollbackFromId = deployment.id;
    (rollback as any).isRollback = true;

    storage.addAuditLog(userId, { action: "rollback", resource: "deployment", resourceId: rollback.id, resourceName: `${deployment.pipelineName} v${deployment.version}`, details: `Rolled back in ${deployment.environment}`, user: "user" });

    res.json(rollback);
  });

  // ========================================
  // Skill Marketplace (global)
  // ========================================
  app.get("/api/marketplace/skills", (_req, res) => {
    res.json(storage.getSkillMarketplace());
  });

  app.post("/api/marketplace/skills/:id/install", (req, res) => {
    const userId = req.session.userId!;
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ error: "agentId required" });
    const result = storage.installSkill(userId, req.params.id, agentId);
    if (!result) return res.status(404).json({ error: "Skill or agent not found" });
    res.json({ ok: true });
  });

  app.post("/api/marketplace/skills/:id/uninstall", (req, res) => {
    const userId = req.session.userId!;
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ error: "agentId required" });
    const result = storage.uninstallSkill(userId, req.params.id, agentId);
    if (!result) return res.status(404).json({ error: "Skill or agent not found" });
    res.json({ ok: true });
  });

  // ========================================
  // Audit Log
  // ========================================
  app.get("/api/audit-log", (req, res) => {
    const userId = req.session.userId!;
    const { resource, action, limit } = req.query;
    res.json(storage.getAuditLog(userId, {
      resource: resource as string,
      action: action as string,
      limit: limit ? parseInt(limit as string) : undefined,
    }));
  });

  app.delete("/api/audit-log", (req, res) => {
    const userId = req.session.userId!;
    storage.clearAuditLog(userId);
    res.json({ ok: true });
  });

  // ========================================
  // Onboarding
  // ========================================
  app.get("/api/onboarding", (req, res) => {
    const userId = req.session.userId!;
    const user = storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.onboarding);
  });

  app.post("/api/onboarding/step", (req, res) => {
    const userId = req.session.userId!;
    const user = storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { step } = req.body;
    if (step && user.onboarding.steps.hasOwnProperty(step)) {
      (user.onboarding.steps as Record<string, boolean>)[step] = true;
    }
    // Auto-advance currentStep
    const stepKeys = Object.keys(user.onboarding.steps);
    const completedCount = stepKeys.filter(k => (user.onboarding.steps as Record<string, boolean>)[k]).length;
    user.onboarding.currentStep = completedCount;
    if (completedCount === stepKeys.length) {
      user.onboarding.completed = true;
    }
    res.json(user.onboarding);
  });

  app.post("/api/onboarding/complete", (req, res) => {
    const userId = req.session.userId!;
    const user = storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.onboarding.completed = true;
    res.json(user.onboarding);
  });

  // ========================================
  // Pricing / Subscription
  // ========================================
  app.get("/api/pricing", (_req, res) => {
    // Public pricing info (imported from schema)
    res.json(PRICING_TIERS);
  });

  app.get("/api/subscription", (req, res) => {
    const userId = req.session.userId!;
    const user = storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      tier: user.tier,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
    });
  });

  app.post("/api/subscription/upgrade", (req, res) => {
    const userId = req.session.userId!;
    const user = storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const { tier } = req.body;
    if (!["free", "pro", "team", "enterprise"].includes(tier)) {
      return res.status(400).json({ error: "Invalid tier" });
    }
    // In production, this would create a Stripe checkout session
    // For now, stub it so the frontend flow works end-to-end
    user.tier = tier;
    storage.addAuditLog(userId, {
      action: "update",
      resource: "setting",
      resourceId: "subscription",
      resourceName: "Subscription",
      details: `Upgraded to ${tier} plan`,
      user: user.username,
    });
    res.json({
      tier: user.tier,
      status: "active",
      // In production: return Stripe checkout URL
      checkoutUrl: null,
      message: `Plan updated to ${tier}. In production, this will redirect to Stripe.`,
    });
  });

  // ========================================
  // Rate Limiting Info (per-tier limits)
  // ========================================
  app.get("/api/usage", (req, res) => {
    const userId = req.session.userId!;
    const user = storage.getUserById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const tierConfig = PRICING_TIERS.find(t => t.id === user.tier);
    const pipelines = storage.getPipelines(userId);
    const agents = storage.getAgents(userId);
    const workflows = storage.getWorkflows(userId);
    res.json({
      tier: user.tier,
      limits: tierConfig?.limits || {},
      usage: {
        pipelines: pipelines.length,
        agents: agents.length,
        workflows: workflows.length,
        buildsThisMonth: pipelines.filter(p => p.status === "success" || p.status === "failed").length,
      },
    });
  });

  // ========================================
  // Admin API
  // ========================================

  app.get("/api/admin/users", requireAdmin, (_req, res) => {
    const users = storage.getAllUsers().map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      tier: u.tier,
      suspended: u.suspended,
      suspendedAt: u.suspendedAt,
      createdAt: u.createdAt,
    }));
    res.json(users);
  });

  app.patch("/api/admin/users/:id/tier", requireAdmin, (req, res) => {
    const { tier } = req.body;
    const userId = req.params.id as string;
    if (!["free", "pro", "team", "enterprise"].includes(tier)) {
      return res.status(400).json({ error: "Invalid tier" });
    }
    const user = storage.updateUserTier(userId, tier);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, email: user.email, username: user.username, role: user.role, tier: user.tier, suspended: user.suspended });
  });

  app.patch("/api/admin/users/:id/role", requireAdmin, (req, res) => {
    const { role } = req.body;
    const userId = req.params.id as string;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    // Prevent removing your own admin role
    if (userId === req.session.userId && role !== "admin") {
      return res.status(400).json({ error: "Cannot remove your own admin role" });
    }
    const user = storage.updateUserRole(userId, role);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, email: user.email, username: user.username, role: user.role, tier: user.tier, suspended: user.suspended });
  });

  app.patch("/api/admin/users/:id/suspend", requireAdmin, (req, res) => {
    const { suspended } = req.body;
    const userId = req.params.id as string;
    const user = suspended ? storage.suspendUser(userId) : storage.unsuspendUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.role === "admin") return res.status(400).json({ error: "Cannot suspend admin" });
    res.json({ id: user.id, email: user.email, username: user.username, role: user.role, tier: user.tier, suspended: user.suspended, suspendedAt: user.suspendedAt });
  });

  app.get("/api/admin/stats", requireAdmin, (_req, res) => {
    const stats = storage.getAdminStats();
    res.json(stats);
  });

  app.get("/api/admin/revenue", requireAdmin, (_req, res) => {
    const users = storage.getAllUsers();
    let mrr = 0;
    for (const u of users) {
      const tierInfo = PRICING_TIERS.find(t => t.id === u.tier);
      if (tierInfo && tierInfo.price > 0) {
        mrr += tierInfo.price;
      }
    }
    const tierRevenue: Record<string, { count: number; revenue: number }> = {};
    for (const tier of PRICING_TIERS) {
      const count = users.filter(u => u.tier === tier.id).length;
      tierRevenue[tier.id] = { count, revenue: count * Math.max(tier.price, 0) };
    }
    res.json({ mrr, arr: mrr * 12, tierRevenue });
  });

  return httpServer;
}
