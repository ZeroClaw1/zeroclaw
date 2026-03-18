import { randomUUID } from "crypto";
import { persistUser, loadUsersFromDb } from "./db";
import type {
  Pipeline, InsertPipeline, PipelineStep,
  Agent, InsertAgent,
  Workflow, InsertWorkflow,
  Deployment, InsertDeployment,
  OpenClawConfig, UpdateOpenClawConfig,
  ActivityEvent, DashboardStats,
  Plan, InsertPlan, UpdatePlan, PlanPhase, PlanTemplate,
  ApiKey, InsertApiKey,
  DashboardSettings, UpdateDashboardSettings,
  Notification,
  Secret, InsertSecret,
  WebhookConfig, InsertWebhookConfig,
  PipelineArtifact,
  AgentTask, InsertAgentTask,
  PipelineTemplate,
  SkillMarketplaceItem,
  AuditLogEntry,
  User,
  SubscriptionTier,
  ObsidianVaultConfig,
  VaultNote,
  ContextSession,
  UpdateVaultConfig,
} from "@shared/schema";

// Internal type to attach userId to entities
type WithUserId<T> = T & { _userId: string };

export interface IStorage {
  // Users
  createUser(data: { email: string; username: string; passwordHash: string }): User;
  getUserByEmail(email: string): User | undefined;
  getUserById(id: string): User | undefined;

  // Pipelines
  getPipelines(userId: string): Pipeline[];
  getPipeline(userId: string, id: string): Pipeline | undefined;
  createPipeline(userId: string, data: InsertPipeline): Pipeline;
  createPipelineRaw(userId: string, data: InsertPipeline): Pipeline;
  updatePipelineStatus(userId: string, id: string, status: Pipeline["status"]): Pipeline | undefined;
  deletePipeline(userId: string, id: string): boolean;

  // Agents
  getAgents(userId: string): Agent[];
  getAgent(userId: string, id: string): Agent | undefined;
  createAgent(userId: string, data: InsertAgent): Agent;
  updateAgent(userId: string, id: string, data: Partial<Agent>): Agent | undefined;
  deleteAgent(userId: string, id: string): boolean;

  // Workflows
  getWorkflows(userId: string): Workflow[];
  getWorkflow(userId: string, id: string): Workflow | undefined;
  createWorkflow(userId: string, data: InsertWorkflow): Workflow;
  updateWorkflow(userId: string, id: string, data: Partial<InsertWorkflow>): Workflow | undefined;
  deleteWorkflow(userId: string, id: string): boolean;

  // Deployments
  getDeployments(userId: string): Deployment[];
  getDeployment(userId: string, id: string): Deployment | undefined;
  createDeployment(userId: string, data: InsertDeployment): Deployment;
  updateDeploymentStatus(userId: string, id: string, status: Deployment["status"]): Deployment | undefined;

  // Activity
  getActivity(userId: string): ActivityEvent[];
  addActivity(userId: string, event: Omit<ActivityEvent, "id" | "timestamp">): ActivityEvent;

  // OpenClaw Config
  getOpenClawConfig(userId: string): OpenClawConfig;
  updateOpenClawConfig(userId: string, data: UpdateOpenClawConfig): OpenClawConfig;
  setOpenClawConnected(userId: string, connected: boolean): void;

  // Plans
  getPlans(userId: string): Plan[];
  getPlan(userId: string, id: string): Plan | undefined;
  createPlan(userId: string, data: InsertPlan): Plan;
  updatePlan(userId: string, id: string, data: UpdatePlan): Plan | undefined;
  deletePlan(userId: string, id: string): boolean;
  getPlanTemplates(): PlanTemplate[];

  // Notifications
  getNotifications(userId: string): Notification[];
  addNotification(userId: string, n: Omit<Notification, "id" | "timestamp" | "read">): Notification;
  markAllRead(userId: string): void;
  clearNotifications(userId: string): void;

  // Dashboard Settings
  getDashboardSettings(userId: string): DashboardSettings;
  updateDashboardSettings(userId: string, data: UpdateDashboardSettings): DashboardSettings;

  // Stats
  getStats(userId: string): DashboardStats;

  // API Keys
  getApiKeys(userId: string): ApiKey[];
  getApiKey(userId: string, id: string): ApiKey | undefined;
  getApiKeyByRaw(userId: string, rawKey: string): ApiKey | undefined;
  createApiKey(userId: string, data: InsertApiKey): { apiKey: ApiKey; rawKey: string };
  deleteApiKey(userId: string, id: string): boolean;
  isAuthEnabled(userId: string): boolean;
  setAuthEnabled(userId: string, enabled: boolean): void;

  // Secrets
  getSecrets(userId: string): Secret[];
  getSecret(userId: string, id: string): Secret | undefined;
  createSecret(userId: string, data: InsertSecret): { secret: Secret; rawValue: string };
  deleteSecret(userId: string, id: string): boolean;

  // Webhooks
  getWebhooks(userId: string): WebhookConfig[];
  getWebhook(userId: string, id: string): WebhookConfig | undefined;
  createWebhook(userId: string, data: InsertWebhookConfig): WebhookConfig;
  updateWebhook(userId: string, id: string, data: Partial<InsertWebhookConfig>): WebhookConfig | undefined;
  deleteWebhook(userId: string, id: string): boolean;

  // Artifacts
  getArtifacts(userId: string, pipelineId: string): PipelineArtifact[];
  addArtifact(userId: string, data: Omit<PipelineArtifact, "id" | "createdAt">): PipelineArtifact;

  // Agent Tasks
  getAgentTasks(userId: string, agentId?: string): AgentTask[];
  createAgentTask(userId: string, data: InsertAgentTask): AgentTask;
  updateAgentTask(userId: string, id: string, data: Partial<AgentTask>): AgentTask | undefined;
  deleteAgentTask(userId: string, id: string): boolean;

  // Pipeline Templates (global)
  getPipelineTemplates(): PipelineTemplate[];

  // Skill Marketplace (global)
  getSkillMarketplace(): SkillMarketplaceItem[];
  installSkill(userId: string, id: string, agentId: string): boolean;
  uninstallSkill(userId: string, id: string, agentId: string): boolean;

  // Obsidian Vault / Context Management
  getVaultConfig(userId: string): ObsidianVaultConfig | null;
  updateVaultConfig(userId: string, data: UpdateVaultConfig): ObsidianVaultConfig;
  getVaultNotes(userId: string): VaultNote[];
  getVaultNote(userId: string, noteId: string): VaultNote | undefined;
  getContextSessions(userId: string): ContextSession[];
  installObsidianSkill(userId: string, vaultPath: string, syncMethod: ObsidianVaultConfig["syncMethod"]): ObsidianVaultConfig;
  uninstallObsidianSkill(userId: string): boolean;

  // Audit Log
  addAuditLog(userId: string, entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry;
  getAuditLog(userId: string, options?: { resource?: string; action?: string; limit?: number }): AuditLogEntry[];
  clearAuditLog(userId: string): void;

  // Admin
  getAllUsers(): User[];
  updateUserTier(userId: string, tier: SubscriptionTier): User | undefined;
  suspendUser(userId: string): User | undefined;
  unsuspendUser(userId: string): User | undefined;
  updateUserRole(userId: string, role: "user" | "admin"): User | undefined;
  getAdminStats(): { totalUsers: number; tierBreakdown: Record<string, number>; suspendedCount: number; recentSignups: number };
}

const DEFAULT_OPENCLAW_CONFIG: OpenClawConfig = {
  gatewayUrl: "http://localhost",
  gatewayPort: 18789,
  model: "Claude Opus 4.6",
  fallbackModels: ["Claude Sonnet 4.5", "Claude Haiku"],
  heartbeatInterval: 30,
  skills: [],
  connected: false,
  autoReconnect: true,
  securityTools: {
    secureClaw: true,
    clawBands: true,
    aquaman: false,
  },
};

const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  dashboardName: "ZeroClaw Dashboard",
  defaultPipelineTimeout: 300,
  autoRefreshInterval: 5,
  theme: "dark",
  accentColor: "teal",
  compactMode: false,
  pipelineNotifications: true,
  deploymentNotifications: true,
  agentStatusNotifications: true,
  soundEffects: false,
  gatewayUrl: "http://localhost",
  gatewayPort: 18789,
  autoReconnect: true,
  heartbeatInterval: 30,
  widgetLayout: [
    { id: "kpi-stats", visible: true, order: 0 },
    { id: "recent-pipelines", visible: true, order: 1 },
    { id: "activity-feed", visible: true, order: 2 },
    { id: "agent-status", visible: true, order: 3 },
    { id: "deployment-summary", visible: true, order: 4 },
    { id: "quick-actions", visible: true, order: 5 },
  ],
};

export class MemStorage implements IStorage {
  // User-scoped data
  private users: Map<string, User> = new Map();
  private pipelines: Map<string, WithUserId<Pipeline>> = new Map();
  private agents: Map<string, WithUserId<Agent>> = new Map();
  private workflows: Map<string, WithUserId<Workflow>> = new Map();
  private deployments: Map<string, WithUserId<Deployment>> = new Map();
  private plans: Map<string, WithUserId<Plan>> = new Map();
  private activityByUser: Map<string, ActivityEvent[]> = new Map();
  private openClawConfigs: Map<string, OpenClawConfig> = new Map();
  private apiKeys: Map<string, WithUserId<ApiKey & { rawKey: string }>> = new Map();
  private authEnabledByUser: Map<string, boolean> = new Map();
  private dashboardSettingsByUser: Map<string, DashboardSettings> = new Map();
  private notificationsByUser: Map<string, Notification[]> = new Map();
  private secrets: Map<string, WithUserId<Secret & { rawValue: string }>> = new Map();
  private webhooks: Map<string, WithUserId<WebhookConfig>> = new Map();
  private artifacts: Map<string, WithUserId<PipelineArtifact>> = new Map();
  private agentTasks: Map<string, WithUserId<AgentTask>> = new Map();
  private auditLogByUser: Map<string, AuditLogEntry[]> = new Map();

  // Vault / Context data (per-user)
  private vaultConfigs: Map<string, ObsidianVaultConfig> = new Map();
  private vaultNotes: Map<string, VaultNote[]> = new Map();
  private contextSessions: Map<string, ContextSession[]> = new Map();

  // Global data (no userId)
  private pipelineTemplates: PipelineTemplate[] = [];
  private skillMarketplace: SkillMarketplaceItem[] = [];

  constructor() {
    this.seedGlobal();
  }

  /** Load persisted users from PostgreSQL on startup */
  async initFromDb() {
    try {
      const dbUsers = await loadUsersFromDb();
      for (const u of dbUsers) {
        const user: User = {
          id: u.id,
          email: u.email,
          username: u.username,
          passwordHash: u.passwordHash,
          role: u.role as User["role"],
          tier: u.tier as User["tier"],
          suspended: u.suspended,
          suspendedAt: u.suspendedAt,
          onboarding: u.onboarding,
          teamId: u.teamId,
          createdAt: u.createdAt,
        };
        this.users.set(user.id, user);
        // Initialize per-user config stores if not already set
        if (!this.openClawConfigs.has(user.id)) {
          this.openClawConfigs.set(user.id, { ...DEFAULT_OPENCLAW_CONFIG });
        }
        if (!this.dashboardSettingsByUser.has(user.id)) {
          this.dashboardSettingsByUser.set(user.id, { ...DEFAULT_DASHBOARD_SETTINGS, widgetLayout: [...DEFAULT_DASHBOARD_SETTINGS.widgetLayout!] });
        }
        if (!this.activityByUser.has(user.id)) this.activityByUser.set(user.id, []);
        if (!this.notificationsByUser.has(user.id)) this.notificationsByUser.set(user.id, []);
        if (!this.auditLogByUser.has(user.id)) this.auditLogByUser.set(user.id, []);
        if (!this.authEnabledByUser.has(user.id)) this.authEnabledByUser.set(user.id, false);
      }
      if (dbUsers.length > 0) {
        console.log(`[storage] Loaded ${dbUsers.length} user(s) from database`);
      }
    } catch (err) {
      console.error("[storage] Failed to load users from database:", err);
    }
  }

  /** Fire-and-forget persist a user to PostgreSQL */
  private persistUserToDb(user: User) {
    persistUser(user).catch((err) => {
      console.error(`[storage] Failed to persist user ${user.id}:`, err);
    });
  }

  private seedGlobal() {
    // Pipeline templates (global)
    this.pipelineTemplates = [
      { id: "tpl-nodejs", name: "Node.js CI", description: "Lint, test, and build a Node.js project", icon: "code", steps: [{ name: "Lint", type: "lint" }, { name: "Test", type: "test" }, { name: "Build", type: "build" }], envVars: { NODE_ENV: "production" }, branch: "main" },
      { id: "tpl-docker", name: "Docker Build & Deploy", description: "Build Docker image, scan, and deploy", icon: "container", steps: [{ name: "Build Image", type: "build" }, { name: "Security Scan", type: "scan" }, { name: "Deploy", type: "deploy" }], envVars: { DOCKER_REGISTRY: "ghcr.io" }, branch: "main" },
      { id: "tpl-fullcicd", name: "Full CI/CD", description: "Complete pipeline: lint, test, build, scan, deploy, notify", icon: "rocket", steps: [{ name: "Lint", type: "lint" }, { name: "Test", type: "test" }, { name: "Build", type: "build" }, { name: "Scan", type: "scan" }, { name: "Deploy", type: "deploy" }, { name: "Notify", type: "notify" }], envVars: {}, branch: "main" },
      { id: "tpl-security", name: "Security Scan", description: "Lint and scan code for vulnerabilities", icon: "shield", steps: [{ name: "Lint", type: "lint" }, { name: "Security Scan", type: "scan" }, { name: "Notify", type: "notify" }], envVars: {}, branch: "main" },
      { id: "tpl-openclaw", name: "ZeroClaw Agent Deploy", description: "Build, run OpenClaw agent review, then deploy", icon: "bot", steps: [{ name: "Build", type: "build" }, { name: "OpenClaw Review", type: "openclaw" }, { name: "Deploy", type: "deploy" }], envVars: {}, branch: "main" },
    ];

    // Skill marketplace (global)
    this.skillMarketplace = [
      { id: "skill-013", name: "Obsidian Vault", description: "Connect your Obsidian vault for Zettelkasten-based context management. Search, retrieve, and feed notes to your agents.", category: "knowledge", version: "1.0.0", author: "ZeroClaw", downloads: 15600, rating: 4.9, icon: "brain", installed: false },
    ];
  }

  // ---- Users ----
  createUser(data: { email: string; username: string; passwordHash: string }): User {
    const id = `user-${randomUUID().slice(0, 8)}`;
    const ADMIN_EMAIL = "taylordbh@gmail.com";
    const user: User = {
      id,
      email: data.email,
      username: data.username,
      passwordHash: data.passwordHash,
      role: data.email.toLowerCase() === ADMIN_EMAIL ? "admin" : "user",
      tier: "free",
      suspended: false,
      suspendedAt: null,
      onboarding: {
        completed: false,
        currentStep: 0,
        steps: {
          accountCreated: true,
          openclawConnected: false,
          firstAgentCreated: false,
          firstPipelineRun: false,
          firstWorkflow: false,
        },
      },
      teamId: null,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, user);
    // Initialize per-user config stores
    this.openClawConfigs.set(id, { ...DEFAULT_OPENCLAW_CONFIG });
    this.dashboardSettingsByUser.set(id, { ...DEFAULT_DASHBOARD_SETTINGS, widgetLayout: [...DEFAULT_DASHBOARD_SETTINGS.widgetLayout!] });
    this.activityByUser.set(id, []);
    this.notificationsByUser.set(id, []);
    this.auditLogByUser.set(id, []);
    this.authEnabledByUser.set(id, false);
    this.persistUserToDb(user);
    return user;
  }

  getUserByEmail(email: string): User | undefined {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  // ---- Pipelines ----
  getPipelines(userId: string): Pipeline[] {
    return Array.from(this.pipelines.values())
      .filter((p) => p._userId === userId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  getPipeline(userId: string, id: string): Pipeline | undefined {
    const p = this.pipelines.get(id);
    if (!p || p._userId !== userId) return undefined;
    return p;
  }

  createPipeline(userId: string, data: InsertPipeline): Pipeline {
    return this.createPipelineRaw(userId, data);
  }

  createPipelineRaw(userId: string, data: InsertPipeline): Pipeline {
    const id = `pl-${randomUUID().slice(0, 6)}`;
    const pipeline: WithUserId<Pipeline> = {
      _userId: userId,
      id,
      name: data.name,
      description: data.description || "",
      status: "pending",
      branch: data.branch,
      commit: data.commit || randomUUID().slice(0, 7),
      author: data.author || "user",
      duration: 0,
      startedAt: new Date().toISOString(),
      steps: (data.steps || []).map((s, i) => ({
        id: `${id}-s${i}`,
        name: s.name,
        type: s.type,
        status: "pending" as const,
        duration: 0,
      })),
      envVars: data.envVars || {},
    };
    this.pipelines.set(id, pipeline);
    this.addActivity(userId, { type: "pipeline", message: `Pipeline "${pipeline.name}" created on ${pipeline.branch}`, status: "pending" });
    this.addAuditLog(userId, { action: "create", resource: "pipeline", resourceId: id, resourceName: pipeline.name, details: `Created on branch ${pipeline.branch}`, user: pipeline.author });
    return pipeline;
  }

  updatePipelineStatus(userId: string, id: string, status: Pipeline["status"]): Pipeline | undefined {
    const pipeline = this.pipelines.get(id);
    if (!pipeline || pipeline._userId !== userId) return undefined;
    pipeline.status = status;
    this.pipelines.set(id, pipeline);
    return pipeline;
  }

  deletePipeline(userId: string, id: string): boolean {
    const pipeline = this.pipelines.get(id);
    if (!pipeline || pipeline._userId !== userId) return false;
    this.addActivity(userId, { type: "pipeline", message: `Pipeline "${pipeline.name}" deleted`, status: "cancelled" });
    this.addAuditLog(userId, { action: "delete", resource: "pipeline", resourceId: id, resourceName: pipeline.name, details: "Pipeline deleted", user: "user" });
    return this.pipelines.delete(id);
  }

  // ---- Agents ----
  getAgents(userId: string): Agent[] {
    return Array.from(this.agents.values()).filter((a) => a._userId === userId);
  }

  getAgent(userId: string, id: string): Agent | undefined {
    const a = this.agents.get(id);
    if (!a || a._userId !== userId) return undefined;
    return a;
  }

  createAgent(userId: string, data: InsertAgent): Agent {
    const id = `ag-${randomUUID().slice(0, 6)}`;
    const agent: WithUserId<Agent> = {
      _userId: userId,
      id,
      name: data.name,
      status: "offline",
      model: data.model,
      gatewayUrl: data.gatewayUrl,
      skills: data.skills || [],
      lastHeartbeat: new Date().toISOString(),
      tasksCompleted: 0,
      uptime: 0,
      memoryUsage: 0,
    };
    this.agents.set(id, agent);
    this.addActivity(userId, { type: "agent", message: `Agent "${agent.name}" registered (${agent.model})`, status: "offline" });
    this.addAuditLog(userId, { action: "create", resource: "agent", resourceId: id, resourceName: agent.name, details: `Registered with model ${agent.model}`, user: "user" });
    return agent;
  }

  updateAgent(userId: string, id: string, data: Partial<Agent>): Agent | undefined {
    const agent = this.agents.get(id);
    if (!agent || agent._userId !== userId) return undefined;
    const updated: WithUserId<Agent> = { ...agent, ...data, id: agent.id, _userId: userId };
    this.agents.set(id, updated);
    return updated;
  }

  deleteAgent(userId: string, id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent || agent._userId !== userId) return false;
    this.addActivity(userId, { type: "agent", message: `Agent "${agent.name}" removed`, status: "offline" });
    this.addAuditLog(userId, { action: "delete", resource: "agent", resourceId: id, resourceName: agent.name, details: "Agent removed", user: "user" });
    return this.agents.delete(id);
  }

  // ---- Workflows ----
  getWorkflows(userId: string): Workflow[] {
    return Array.from(this.workflows.values()).filter((w) => w._userId === userId);
  }

  getWorkflow(userId: string, id: string): Workflow | undefined {
    const w = this.workflows.get(id);
    if (!w || w._userId !== userId) return undefined;
    return w;
  }

  createWorkflow(userId: string, data: InsertWorkflow): Workflow {
    const id = `wf-${randomUUID().slice(0, 6)}`;
    const workflow: WithUserId<Workflow> = {
      _userId: userId,
      id,
      name: data.name,
      description: data.description || "",
      trigger: data.trigger,
      lastRun: "",
      status: "pending",
      totalRuns: 0,
      successRate: 0,
      nodes: data.nodes || [],
      edges: data.edges || [],
    };
    this.workflows.set(id, workflow);
    this.addActivity(userId, { type: "openclaw", message: `Workflow "${workflow.name}" created`, status: "pending" });
    return workflow;
  }

  updateWorkflow(userId: string, id: string, data: Partial<InsertWorkflow>): Workflow | undefined {
    const workflow = this.workflows.get(id);
    if (!workflow || workflow._userId !== userId) return undefined;
    const updated: WithUserId<Workflow> = {
      ...workflow,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.trigger !== undefined ? { trigger: data.trigger } : {}),
      ...(data.nodes !== undefined ? { nodes: data.nodes } : {}),
      ...(data.edges !== undefined ? { edges: data.edges } : {}),
    };
    this.workflows.set(id, updated);
    return updated;
  }

  deleteWorkflow(userId: string, id: string): boolean {
    const workflow = this.workflows.get(id);
    if (!workflow || workflow._userId !== userId) return false;
    this.addActivity(userId, { type: "openclaw", message: `Workflow "${workflow.name}" deleted`, status: "cancelled" });
    return this.workflows.delete(id);
  }

  // ---- Deployments ----
  getDeployments(userId: string): Deployment[] {
    return Array.from(this.deployments.values())
      .filter((d) => d._userId === userId)
      .sort((a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime());
  }

  getDeployment(userId: string, id: string): Deployment | undefined {
    const d = this.deployments.get(id);
    if (!d || d._userId !== userId) return undefined;
    return d;
  }

  createDeployment(userId: string, data: InsertDeployment): Deployment {
    const id = `dep-${randomUUID().slice(0, 6)}`;
    const pipeline = this.pipelines.get(data.pipelineId);
    const deployment: WithUserId<Deployment> = {
      _userId: userId,
      id,
      pipelineId: data.pipelineId,
      pipelineName: pipeline?.name || "unknown",
      environment: data.environment,
      status: "running",
      version: data.version,
      deployedAt: new Date().toISOString(),
      deployedBy: data.deployedBy || "user",
      duration: 0,
      url: data.url,
    };
    this.deployments.set(id, deployment);
    this.addActivity(userId, {
      type: "deployment",
      message: `Deploying ${deployment.pipelineName} v${deployment.version} to ${deployment.environment}`,
      status: "running",
    });
    this.addAuditLog(userId, { action: "create", resource: "deployment", resourceId: id, resourceName: `${deployment.pipelineName} v${deployment.version}`, details: `Deployed to ${deployment.environment}`, user: deployment.deployedBy });

    // Simulate deployment completion
    setTimeout(() => {
      deployment.status = "success";
      deployment.duration = Math.floor(15 + Math.random() * 45);
      this.deployments.set(id, deployment);
      this.addActivity(userId, {
        type: "deployment",
        message: `${deployment.pipelineName} v${deployment.version} deployed to ${deployment.environment}`,
        status: "success",
      });
    }, 5000 + Math.random() * 10000);

    return deployment;
  }

  updateDeploymentStatus(userId: string, id: string, status: Deployment["status"]): Deployment | undefined {
    const deployment = this.deployments.get(id);
    if (!deployment || deployment._userId !== userId) return undefined;
    deployment.status = status;
    this.deployments.set(id, deployment);
    return deployment;
  }

  // ---- Activity ----
  getActivity(userId: string): ActivityEvent[] {
    const activity = this.activityByUser.get(userId) || [];
    return activity.slice().sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 50);
  }

  addActivity(userId: string, event: Omit<ActivityEvent, "id" | "timestamp">): ActivityEvent {
    const full: ActivityEvent = {
      ...event,
      id: `ev-${randomUUID().slice(0, 6)}`,
      timestamp: new Date().toISOString(),
    };
    let activity = this.activityByUser.get(userId);
    if (!activity) {
      activity = [];
      this.activityByUser.set(userId, activity);
    }
    activity.push(full);
    if (activity.length > 200) {
      this.activityByUser.set(userId, activity.slice(-100));
    }
    return full;
  }

  // ---- OpenClaw Config ----
  getOpenClawConfig(userId: string): OpenClawConfig {
    const config = this.openClawConfigs.get(userId);
    if (!config) return { ...DEFAULT_OPENCLAW_CONFIG };
    return { ...config };
  }

  updateOpenClawConfig(userId: string, data: UpdateOpenClawConfig): OpenClawConfig {
    let config = this.openClawConfigs.get(userId);
    if (!config) {
      config = { ...DEFAULT_OPENCLAW_CONFIG };
      this.openClawConfigs.set(userId, config);
    }
    if (data.gatewayUrl !== undefined) config.gatewayUrl = data.gatewayUrl;
    if (data.gatewayPort !== undefined) config.gatewayPort = data.gatewayPort;
    if (data.model !== undefined) config.model = data.model;
    if (data.fallbackModels !== undefined) config.fallbackModels = data.fallbackModels;
    if (data.heartbeatInterval !== undefined) config.heartbeatInterval = data.heartbeatInterval;
    if (data.autoReconnect !== undefined) config.autoReconnect = data.autoReconnect;
    if (data.securityTools) {
      if (data.securityTools.secureClaw !== undefined) config.securityTools.secureClaw = data.securityTools.secureClaw;
      if (data.securityTools.clawBands !== undefined) config.securityTools.clawBands = data.securityTools.clawBands;
      if (data.securityTools.aquaman !== undefined) config.securityTools.aquaman = data.securityTools.aquaman;
    }
    return { ...config };
  }

  setOpenClawConnected(userId: string, connected: boolean): void {
    let config = this.openClawConfigs.get(userId);
    if (!config) {
      config = { ...DEFAULT_OPENCLAW_CONFIG };
      this.openClawConfigs.set(userId, config);
    }
    config.connected = connected;
    if (connected) {
      this.addActivity(userId, { type: "openclaw", message: "OpenClaw gateway connected", status: "success" });
    } else {
      this.addActivity(userId, { type: "openclaw", message: "OpenClaw gateway disconnected", status: "failed" });
    }
  }

  // ---- Plans ----
  getPlans(userId: string): Plan[] {
    return Array.from(this.plans.values())
      .filter((p) => p._userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getPlan(userId: string, id: string): Plan | undefined {
    const p = this.plans.get(id);
    if (!p || p._userId !== userId) return undefined;
    return p;
  }

  createPlan(userId: string, data: InsertPlan): Plan {
    const id = `plan-${randomUUID().slice(0, 6)}`;
    const now = new Date().toISOString();

    let markdown = data.markdown || "";
    if (data.template && !markdown) {
      const templates = this.getPlanTemplates();
      const tpl = templates.find((t) => t.id === data.template);
      if (tpl) markdown = tpl.markdown;
    }

    // Parse phases from the markdown
    const phases: PlanPhase[] = [];
    const phaseRegex = /^##\s+Phase\s+(\d+):\s*(.+)/gm;
    let match: RegExpExecArray | null;
    const lines = markdown.split("\n");
    while ((match = phaseRegex.exec(markdown)) !== null) {
      const phaseTitle = match[2].trim();
      const phaseId = `phase-${match[1]}`;
      const startLineIdx = markdown.substring(0, match.index).split("\n").length - 1;
      const tasks: string[] = [];
      for (let i = startLineIdx + 1; i < lines.length; i++) {
        if (/^##\s/.test(lines[i])) break;
        const taskMatch = lines[i].match(/^-\s+\[[ x]\]\s+(.+)/i);
        if (taskMatch) tasks.push(taskMatch[1].trim());
      }
      phases.push({ id: phaseId, title: phaseTitle, tasks });
    }

    const plan: WithUserId<Plan> = {
      _userId: userId,
      id,
      title: data.title,
      description: data.description || "",
      markdown,
      status: "draft",
      phases,
      template: data.template,
      createdAt: now,
      updatedAt: now,
    };
    this.plans.set(id, plan);
    this.addActivity(userId, { type: "openclaw", message: `Plan "${plan.title}" created`, status: "pending" });
    return plan;
  }

  updatePlan(userId: string, id: string, data: UpdatePlan): Plan | undefined {
    const plan = this.plans.get(id);
    if (!plan || plan._userId !== userId) return undefined;
    const updated: WithUserId<Plan> = {
      ...plan,
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.markdown !== undefined ? { markdown: data.markdown } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.phases !== undefined ? { phases: data.phases } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.plans.set(id, updated);
    return updated;
  }

  deletePlan(userId: string, id: string): boolean {
    const plan = this.plans.get(id);
    if (!plan || plan._userId !== userId) return false;
    this.addActivity(userId, { type: "openclaw", message: `Plan "${plan.title}" deleted`, status: "cancelled" });
    return this.plans.delete(id);
  }

  getPlanTemplates(): PlanTemplate[] {
    return [
      {
        id: "tpl-mobile",
        name: "Mobile App",
        description: "iOS + Android app from scratch",
        markdown: `# Mobile App Plan\n\n## Phase 1: Project Setup\n- [ ] Initialize React Native / Flutter project\n- [ ] Configure development environment\n- [ ] Set up version control and branching strategy\n- [ ] Install core dependencies\n\n## Phase 2: Core Architecture\n- [ ] Design app navigation structure\n- [ ] Set up state management\n- [ ] Configure API client / networking layer\n- [ ] Set up authentication flow\n\n## Phase 3: Feature Development\n- [ ] Build main screen / dashboard\n- [ ] Implement user profile\n- [ ] Build primary feature screens\n- [ ] Add push notifications\n\n## Phase 4: Testing & QA\n- [ ] Write unit tests for business logic\n- [ ] Add integration tests\n- [ ] Run device testing (iOS + Android)\n- [ ] Performance profiling\n\n## Phase 5: Build & Deploy\n- [ ] Configure CI/CD pipeline\n- [ ] Set up app signing (certificates / keystores)\n- [ ] Deploy to TestFlight / Play Console beta\n- [ ] Submit for app store review\n`,
      },
      {
        id: "tpl-webapp",
        name: "Web Application",
        description: "Full-stack web app with API",
        markdown: `# Web Application Plan\n\n## Phase 1: Setup & Architecture\n- [ ] Initialize project (framework selection)\n- [ ] Set up database and ORM\n- [ ] Configure authentication\n- [ ] Design API schema\n\n## Phase 2: Backend Development\n- [ ] Build REST / GraphQL endpoints\n- [ ] Implement business logic\n- [ ] Set up background jobs / queues\n- [ ] Add rate limiting and security\n\n## Phase 3: Frontend Development\n- [ ] Build component library\n- [ ] Implement pages and routing\n- [ ] Connect to API\n- [ ] Add responsive design\n\n## Phase 4: Testing\n- [ ] Unit tests (backend + frontend)\n- [ ] E2E tests with Playwright / Cypress\n- [ ] Load testing\n- [ ] Security audit\n\n## Phase 5: Deploy & Monitor\n- [ ] Set up staging environment\n- [ ] Configure CI/CD pipeline\n- [ ] Deploy to production\n- [ ] Set up monitoring and alerting\n`,
      },
      {
        id: "tpl-api",
        name: "API / Microservice",
        description: "Backend service with endpoints",
        markdown: `# API Service Plan\n\n## Phase 1: Design\n- [ ] Define API contract (OpenAPI spec)\n- [ ] Design data models\n- [ ] Plan authentication strategy\n- [ ] Document rate limits and quotas\n\n## Phase 2: Implementation\n- [ ] Scaffold project\n- [ ] Implement endpoints\n- [ ] Add validation and error handling\n- [ ] Connect to database\n\n## Phase 3: Testing & Security\n- [ ] Write integration tests\n- [ ] Add security scanning\n- [ ] Load test endpoints\n- [ ] ZeroClaw code review\n\n## Phase 4: Deploy\n- [ ] Containerize (Docker)\n- [ ] Deploy to staging\n- [ ] Run smoke tests\n- [ ] Deploy to production\n`,
      },
      {
        id: "tpl-smart-contract",
        name: "Smart Contract",
        description: "Blockchain / Solana program",
        markdown: `# Smart Contract Plan\n\n## Phase 1: Design\n- [ ] Define program accounts and state\n- [ ] Design instruction set\n- [ ] Plan token economics (if applicable)\n- [ ] Document security considerations\n\n## Phase 2: Development\n- [ ] Scaffold Anchor / Solidity project\n- [ ] Implement core instructions\n- [ ] Build client SDK\n- [ ] Add access control\n\n## Phase 3: Testing\n- [ ] Write unit tests\n- [ ] Local validator testing\n- [ ] Fuzz testing\n- [ ] ZeroClaw security audit\n\n## Phase 4: Deploy\n- [ ] Deploy to devnet\n- [ ] Run testnet integration tests\n- [ ] Security audit (external)\n- [ ] Deploy to mainnet\n`,
      },
      {
        id: "tpl-blank",
        name: "Blank Plan",
        description: "Start from scratch",
        markdown: `# Untitled Plan\n\n## Phase 1: Planning\n- [ ] Define goals and requirements\n- [ ] Break down into tasks\n\n## Phase 2: Implementation\n- [ ] Task 1\n- [ ] Task 2\n\n## Phase 3: Review & Deploy\n- [ ] Testing\n- [ ] Deploy\n`,
      },
    ];
  }

  // ---- Notifications ----
  getNotifications(userId: string): Notification[] {
    const notifs = this.notificationsByUser.get(userId) || [];
    return notifs.slice().sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  addNotification(userId: string, n: Omit<Notification, "id" | "timestamp" | "read">): Notification {
    const notification: Notification = {
      ...n,
      id: `notif-${randomUUID().slice(0, 6)}`,
      read: false,
      timestamp: new Date().toISOString(),
    };
    let notifs = this.notificationsByUser.get(userId);
    if (!notifs) {
      notifs = [];
      this.notificationsByUser.set(userId, notifs);
    }
    notifs.push(notification);
    if (notifs.length > 100) {
      this.notificationsByUser.set(userId, notifs.slice(-50));
    }
    return notification;
  }

  markAllRead(userId: string): void {
    const notifs = this.notificationsByUser.get(userId) || [];
    notifs.forEach((n) => { n.read = true; });
  }

  clearNotifications(userId: string): void {
    this.notificationsByUser.set(userId, []);
  }

  // ---- Dashboard Settings ----
  getDashboardSettings(userId: string): DashboardSettings {
    const settings = this.dashboardSettingsByUser.get(userId);
    if (!settings) return { ...DEFAULT_DASHBOARD_SETTINGS, widgetLayout: [...DEFAULT_DASHBOARD_SETTINGS.widgetLayout!] };
    return { ...settings };
  }

  updateDashboardSettings(userId: string, data: UpdateDashboardSettings): DashboardSettings {
    let settings = this.dashboardSettingsByUser.get(userId);
    if (!settings) {
      settings = { ...DEFAULT_DASHBOARD_SETTINGS, widgetLayout: [...DEFAULT_DASHBOARD_SETTINGS.widgetLayout!] };
      this.dashboardSettingsByUser.set(userId, settings);
    }
    if (data.dashboardName !== undefined) settings.dashboardName = data.dashboardName;
    if (data.defaultPipelineTimeout !== undefined) settings.defaultPipelineTimeout = data.defaultPipelineTimeout;
    if (data.autoRefreshInterval !== undefined) settings.autoRefreshInterval = data.autoRefreshInterval;
    if (data.theme !== undefined) settings.theme = data.theme;
    if (data.accentColor !== undefined) settings.accentColor = data.accentColor;
    if (data.compactMode !== undefined) settings.compactMode = data.compactMode;
    if (data.pipelineNotifications !== undefined) settings.pipelineNotifications = data.pipelineNotifications;
    if (data.deploymentNotifications !== undefined) settings.deploymentNotifications = data.deploymentNotifications;
    if (data.agentStatusNotifications !== undefined) settings.agentStatusNotifications = data.agentStatusNotifications;
    if (data.soundEffects !== undefined) settings.soundEffects = data.soundEffects;
    if (data.gatewayUrl !== undefined) settings.gatewayUrl = data.gatewayUrl;
    if (data.gatewayPort !== undefined) settings.gatewayPort = data.gatewayPort;
    if (data.autoReconnect !== undefined) settings.autoReconnect = data.autoReconnect;
    if (data.heartbeatInterval !== undefined) settings.heartbeatInterval = data.heartbeatInterval;
    if (data.widgetLayout !== undefined) settings.widgetLayout = data.widgetLayout;
    return { ...settings };
  }

  // ---- Stats ----
  getStats(userId: string): DashboardStats {
    const pipelines = this.getPipelines(userId);
    const agents = this.getAgents(userId);
    const deployments = this.getDeployments(userId);

    const activePipelines = pipelines.filter((p) => p.status === "running").length;
    const successfulPipelines = pipelines.filter((p) => p.status === "success").length;
    const successRate = pipelines.length > 0 ? Math.round((successfulPipelines / pipelines.length) * 1000) / 10 : 0;
    const avgBuildTime = pipelines.length > 0
      ? Math.round(pipelines.reduce((sum, p) => sum + p.duration, 0) / pipelines.length)
      : 0;
    const activeAgents = agents.filter((a) => a.status === "online" || a.status === "busy").length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const failedToday = pipelines.filter(
      (p) => p.status === "failed" && new Date(p.startedAt) >= today
    ).length;

    return {
      totalPipelines: pipelines.length,
      activePipelines,
      successRate,
      avgBuildTime,
      totalDeployments: deployments.length,
      activeAgents,
      totalAgents: agents.length,
      failedToday,
    };
  }

  // ---- API Keys ----
  getApiKeys(userId: string): ApiKey[] {
    return Array.from(this.apiKeys.values())
      .filter((k) => k._userId === userId)
      .map(({ rawKey, _userId, ...key }) => key);
  }

  getApiKey(userId: string, id: string): ApiKey | undefined {
    const entry = this.apiKeys.get(id);
    if (!entry || entry._userId !== userId) return undefined;
    const { rawKey, _userId, ...key } = entry;
    return key;
  }

  getApiKeyByRaw(userId: string, raw: string): ApiKey | undefined {
    for (const entry of Array.from(this.apiKeys.values())) {
      if (entry._userId === userId && entry.rawKey === raw) {
        entry.lastUsed = new Date().toISOString();
        const { rawKey, _userId, ...key } = entry;
        return key;
      }
    }
    return undefined;
  }

  createApiKey(userId: string, data: InsertApiKey): { apiKey: ApiKey; rawKey: string } {
    const id = `key-${randomUUID().slice(0, 6)}`;
    const raw = `oc_${randomUUID().replace(/-/g, "")}`;
    const prefix = `oc_...${raw.slice(-4)}`;
    const apiKey: ApiKey = {
      id,
      name: data.name,
      key: raw.slice(-4),
      prefix,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      scopes: data.scopes || ["*"],
    };
    this.apiKeys.set(id, { ...apiKey, rawKey: raw, _userId: userId });
    this.addActivity(userId, { type: "openclaw", message: `API key "${data.name}" created`, status: "success" });
    return { apiKey, rawKey: raw };
  }

  deleteApiKey(userId: string, id: string): boolean {
    const entry = this.apiKeys.get(id);
    if (!entry || entry._userId !== userId) return false;
    this.addActivity(userId, { type: "openclaw", message: `API key "${entry.name}" revoked`, status: "cancelled" });
    return this.apiKeys.delete(id);
  }

  isAuthEnabled(userId: string): boolean {
    return this.authEnabledByUser.get(userId) || false;
  }

  setAuthEnabled(userId: string, enabled: boolean): void {
    this.authEnabledByUser.set(userId, enabled);
  }

  // ---- Secrets ----
  getSecrets(userId: string): Secret[] {
    return Array.from(this.secrets.values())
      .filter((s) => s._userId === userId)
      .map(({ rawValue, _userId, ...s }) => s);
  }

  getSecret(userId: string, id: string): Secret | undefined {
    const entry = this.secrets.get(id);
    if (!entry || entry._userId !== userId) return undefined;
    const { rawValue, _userId, ...s } = entry;
    return s;
  }

  createSecret(userId: string, data: InsertSecret): { secret: Secret; rawValue: string } {
    const id = `sec-${randomUUID().slice(0, 6)}`;
    const now = new Date().toISOString();
    const maskedValue = "••••••••" + data.value.slice(-4);
    const secret: Secret = {
      id,
      name: data.name,
      maskedValue,
      scope: data.scope || "global",
      pipelineIds: data.pipelineIds || [],
      createdAt: now,
      updatedAt: now,
    };
    this.secrets.set(id, { ...secret, rawValue: data.value, _userId: userId });
    this.addAuditLog(userId, { action: "create", resource: "secret", resourceId: id, resourceName: data.name, details: `Scope: ${secret.scope}`, user: "user" });
    return { secret, rawValue: data.value };
  }

  deleteSecret(userId: string, id: string): boolean {
    const entry = this.secrets.get(id);
    if (!entry || entry._userId !== userId) return false;
    this.addAuditLog(userId, { action: "delete", resource: "secret", resourceId: id, resourceName: entry.name, details: "Secret deleted", user: "user" });
    return this.secrets.delete(id);
  }

  // ---- Webhooks ----
  getWebhooks(userId: string): WebhookConfig[] {
    return Array.from(this.webhooks.values()).filter((w) => w._userId === userId);
  }

  getWebhook(userId: string, id: string): WebhookConfig | undefined {
    const w = this.webhooks.get(id);
    if (!w || w._userId !== userId) return undefined;
    return w;
  }

  createWebhook(userId: string, data: InsertWebhookConfig): WebhookConfig {
    const id = `wh-${randomUUID().slice(0, 6)}`;
    const webhook: WithUserId<WebhookConfig> = {
      _userId: userId,
      id,
      name: data.name,
      event: data.event,
      branch: data.branch || "main",
      workflowId: data.workflowId,
      enabled: data.enabled !== undefined ? data.enabled : true,
      lastTriggered: null,
      triggerCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.webhooks.set(id, webhook);
    this.addAuditLog(userId, { action: "create", resource: "webhook", resourceId: id, resourceName: data.name, details: `Event: ${data.event}, branch: ${webhook.branch}`, user: "user" });
    return webhook;
  }

  updateWebhook(userId: string, id: string, data: Partial<InsertWebhookConfig>): WebhookConfig | undefined {
    const webhook = this.webhooks.get(id);
    if (!webhook || webhook._userId !== userId) return undefined;
    const updated: WithUserId<WebhookConfig> = {
      ...webhook,
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.event !== undefined ? { event: data.event } : {}),
      ...(data.branch !== undefined ? { branch: data.branch } : {}),
      ...(data.workflowId !== undefined ? { workflowId: data.workflowId } : {}),
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
    };
    this.webhooks.set(id, updated);
    return updated;
  }

  deleteWebhook(userId: string, id: string): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook || webhook._userId !== userId) return false;
    this.addAuditLog(userId, { action: "delete", resource: "webhook", resourceId: id, resourceName: webhook.name, details: "Webhook deleted", user: "user" });
    return this.webhooks.delete(id);
  }

  // ---- Artifacts ----
  getArtifacts(userId: string, pipelineId: string): PipelineArtifact[] {
    return Array.from(this.artifacts.values()).filter(a => a._userId === userId && a.pipelineId === pipelineId);
  }

  addArtifact(userId: string, data: Omit<PipelineArtifact, "id" | "createdAt">): PipelineArtifact {
    const id = `art-${randomUUID().slice(0, 6)}`;
    const artifact: WithUserId<PipelineArtifact> = {
      _userId: userId,
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    this.artifacts.set(id, artifact);
    return artifact;
  }

  // ---- Agent Tasks ----
  getAgentTasks(userId: string, agentId?: string): AgentTask[] {
    const all = Array.from(this.agentTasks.values()).filter((t) => t._userId === userId);
    const filtered = agentId ? all.filter(t => t.agentId === agentId) : all;
    return filtered.sort((a, b) => {
      const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  createAgentTask(userId: string, data: InsertAgentTask): AgentTask {
    const id = `task-${randomUUID().slice(0, 6)}`;
    const task: WithUserId<AgentTask> = {
      _userId: userId,
      id,
      agentId: data.agentId,
      title: data.title,
      description: data.description || "",
      status: "queued",
      priority: data.priority || "medium",
      pipelineId: data.pipelineId,
      createdAt: new Date().toISOString(),
    };
    this.agentTasks.set(id, task);
    this.addAuditLog(userId, { action: "create", resource: "agent", resourceId: id, resourceName: task.title, details: `Task assigned to agent ${data.agentId}`, user: "user" });
    return task;
  }

  updateAgentTask(userId: string, id: string, data: Partial<AgentTask>): AgentTask | undefined {
    const task = this.agentTasks.get(id);
    if (!task || task._userId !== userId) return undefined;
    const updated: WithUserId<AgentTask> = { ...task, ...data, id: task.id, _userId: userId };
    this.agentTasks.set(id, updated);
    return updated;
  }

  deleteAgentTask(userId: string, id: string): boolean {
    const task = this.agentTasks.get(id);
    if (!task || task._userId !== userId) return false;
    return this.agentTasks.delete(id);
  }

  // ---- Pipeline Templates (global) ----
  getPipelineTemplates(): PipelineTemplate[] {
    return this.pipelineTemplates;
  }

  // ---- Skill Marketplace (global) ----
  getSkillMarketplace(): SkillMarketplaceItem[] {
    return this.skillMarketplace;
  }

  installSkill(userId: string, id: string, agentId: string): boolean {
    const skill = this.skillMarketplace.find(s => s.id === id);
    const agent = this.agents.get(agentId);
    if (!skill || !agent || agent._userId !== userId) return false;
    skill.installed = true;
    skill.downloads += 1;
    if (!agent.skills.includes(skill.name)) {
      agent.skills.push(skill.name);
      this.agents.set(agentId, agent);
    }
    // If installing Obsidian Vault skill, also initialize vault config
    if (id === "skill-013" && !this.vaultConfigs.has(userId)) {
      this.initializeVaultData(userId, "/vault", "local");
    }
    this.addAuditLog(userId, { action: "install", resource: "skill", resourceId: id, resourceName: skill.name, details: `Installed on agent ${agent.name}`, user: "user" });
    return true;
  }

  uninstallSkill(userId: string, id: string, agentId: string): boolean {
    const skill = this.skillMarketplace.find(s => s.id === id);
    const agent = this.agents.get(agentId);
    if (!skill || !agent || agent._userId !== userId) return false;
    skill.installed = false;
    agent.skills = agent.skills.filter(s => s !== skill.name);
    this.agents.set(agentId, agent);
    // If uninstalling Obsidian Vault skill, clear vault data
    if (id === "skill-013") {
      this.vaultConfigs.delete(userId);
      this.vaultNotes.delete(userId);
      this.contextSessions.delete(userId);
    }
    this.addAuditLog(userId, { action: "delete", resource: "skill", resourceId: id, resourceName: skill.name, details: `Uninstalled from agent ${agent.name}`, user: "user" });
    return true;
  }

  uninstallObsidianSkill(userId: string): boolean {
    const skill = this.skillMarketplace.find(s => s.id === "skill-013");
    if (!skill || !skill.installed) return false;
    skill.installed = false;
    this.vaultConfigs.delete(userId);
    this.vaultNotes.delete(userId);
    this.contextSessions.delete(userId);
    this.addAuditLog(userId, { action: "delete", resource: "skill", resourceId: "skill-013", resourceName: skill.name, details: "Uninstalled Obsidian Vault skill", user: "user" });
    return true;
  }

  // ---- Obsidian Vault / Context ----
  private initializeVaultData(userId: string, vaultPath: string, syncMethod: ObsidianVaultConfig["syncMethod"]) {
    const notes = this.createDemoNotes();
    const totalLinks = notes.reduce((sum, n) => sum + n.links.length, 0);

    const config: ObsidianVaultConfig = {
      id: `vault-${randomUUID().slice(0, 8)}`,
      vaultPath,
      syncMethod,
      connected: true,
      lastSynced: new Date().toISOString(),
      totalNotes: notes.length,
      totalLinks,
      includeFolders: ["agents", "prompts", "knowledge"],
      excludeFolders: [".obsidian", ".trash"],
      tokenBudget: 32000,
      retrievalStrategy: "zettelkasten",
    };

    this.vaultConfigs.set(userId, config);
    this.vaultNotes.set(userId, notes);

    // Create demo context sessions
    this.contextSessions.set(userId, [
      { id: "ctx-001", agentId: "agent-1", notesLoaded: 8, tokensUsed: 12400, tokenBudget: 32000, retrievalHits: 23, startedAt: new Date(Date.now() - 3600000).toISOString(), status: "active" },
      { id: "ctx-002", agentId: "agent-2", notesLoaded: 3, tokensUsed: 4200, tokenBudget: 32000, retrievalHits: 7, startedAt: new Date(Date.now() - 7200000).toISOString(), status: "idle" },
      { id: "ctx-003", agentId: "agent-3", notesLoaded: 12, tokensUsed: 28900, tokenBudget: 32000, retrievalHits: 45, startedAt: new Date(Date.now() - 86400000).toISOString(), status: "expired" },
    ]);
  }

  private createDemoNotes(): VaultNote[] {
    const now = Date.now();
    const day = 86400000;
    return [
      { id: "note-001", title: "Agent Architecture Patterns", path: "agents/Agent Architecture Patterns.md", folder: "agents", tags: ["architecture", "moc", "agents"], links: ["note-002", "note-003", "note-004", "note-006", "note-009"], backlinks: ["note-005", "note-010"], wordCount: 1240, lastModified: new Date(now - day * 2).toISOString(), isStructureNote: true, trustState: "canonical" },
      { id: "note-002", title: "ReAct Pattern", path: "agents/ReAct Pattern.md", folder: "agents", tags: ["react", "reasoning", "agents"], links: ["note-001", "note-003", "note-007"], backlinks: ["note-001", "note-006"], wordCount: 680, lastModified: new Date(now - day * 5).toISOString(), isStructureNote: false, trustState: "canonical" },
      { id: "note-003", title: "Chain of Thought Prompting", path: "prompts/Chain of Thought Prompting.md", folder: "prompts", tags: ["cot", "prompting", "reasoning"], links: ["note-007", "note-008"], backlinks: ["note-001", "note-002", "note-007"], wordCount: 520, lastModified: new Date(now - day * 3).toISOString(), isStructureNote: false, trustState: "working" },
      { id: "note-004", title: "Context Window Management", path: "agents/Context Window Management.md", folder: "agents", tags: ["context", "tokens", "optimization"], links: ["note-008", "note-011"], backlinks: ["note-001", "note-008"], wordCount: 890, lastModified: new Date(now - day).toISOString(), isStructureNote: false, trustState: "canonical" },
      { id: "note-005", title: "RAG vs Fine-Tuning", path: "knowledge/RAG vs Fine-Tuning.md", folder: "knowledge", tags: ["rag", "fine-tuning", "comparison"], links: ["note-012", "note-013", "note-001"], backlinks: ["note-010", "note-012"], wordCount: 1100, lastModified: new Date(now - day * 7).toISOString(), isStructureNote: false, trustState: "working" },
      { id: "note-006", title: "Tool Use in AI Agents", path: "agents/Tool Use in AI Agents.md", folder: "agents", tags: ["tools", "function-calling", "agents", "moc"], links: ["note-001", "note-002", "note-009", "note-015"], backlinks: ["note-001", "note-009"], wordCount: 1450, lastModified: new Date(now - day * 4).toISOString(), isStructureNote: true, trustState: "canonical" },
      { id: "note-007", title: "Prompt Engineering Fundamentals", path: "prompts/Prompt Engineering Fundamentals.md", folder: "prompts", tags: ["prompting", "fundamentals", "moc"], links: ["note-003", "note-002", "note-008", "note-014"], backlinks: ["note-002", "note-003"], wordCount: 1680, lastModified: new Date(now - day * 6).toISOString(), isStructureNote: true, trustState: "canonical" },
      { id: "note-008", title: "Token Optimization Strategies", path: "agents/Token Optimization Strategies.md", folder: "agents", tags: ["tokens", "optimization", "cost"], links: ["note-004", "note-003"], backlinks: ["note-003", "note-004", "note-007"], wordCount: 740, lastModified: new Date(now - day * 8).toISOString(), isStructureNote: false, trustState: "stale" },
      { id: "note-009", title: "Multi-Agent Orchestration", path: "agents/Multi-Agent Orchestration.md", folder: "agents", tags: ["multi-agent", "orchestration", "coordination"], links: ["note-001", "note-006", "note-015"], backlinks: ["note-001", "note-006"], wordCount: 960, lastModified: new Date(now - day * 3).toISOString(), isStructureNote: false, trustState: "working" },
      { id: "note-010", title: "Knowledge Graphs for Agents", path: "knowledge/Knowledge Graphs for Agents.md", folder: "knowledge", tags: ["knowledge-graph", "rag", "agents"], links: ["note-001", "note-005", "note-012"], backlinks: ["note-012", "note-013"], wordCount: 830, lastModified: new Date(now - day * 10).toISOString(), isStructureNote: false, trustState: "contested" },
      { id: "note-011", title: "Obsidian as Agent Memory", path: "knowledge/Obsidian as Agent Memory.md", folder: "knowledge", tags: ["obsidian", "memory", "zettelkasten"], links: ["note-004", "note-012"], backlinks: ["note-004"], wordCount: 590, lastModified: new Date(now - day * 2).toISOString(), isStructureNote: false, trustState: "working" },
      { id: "note-012", title: "Vector Embeddings Explained", path: "knowledge/Vector Embeddings Explained.md", folder: "knowledge", tags: ["embeddings", "vectors", "ml"], links: ["note-013", "note-005", "note-010"], backlinks: ["note-005", "note-010", "note-011", "note-013"], wordCount: 1020, lastModified: new Date(now - day * 12).toISOString(), isStructureNote: false, trustState: "canonical" },
      { id: "note-013", title: "Semantic Search Techniques", path: "knowledge/Semantic Search Techniques.md", folder: "knowledge", tags: ["search", "semantic", "retrieval"], links: ["note-012", "note-010"], backlinks: ["note-005", "note-012"], wordCount: 770, lastModified: new Date(now - day * 9).toISOString(), isStructureNote: false, trustState: "working" },
      { id: "note-014", title: "Agent Evaluation Metrics", path: "agents/Agent Evaluation Metrics.md", folder: "agents", tags: ["evaluation", "metrics", "testing"], links: ["note-015"], backlinks: ["note-007"], wordCount: 650, lastModified: new Date(now - day * 14).toISOString(), isStructureNote: false, trustState: "stale" },
      { id: "note-015", title: "Human-in-the-Loop Patterns", path: "agents/Human-in-the-Loop Patterns.md", folder: "agents", tags: ["hitl", "safety", "alignment"], links: ["note-006", "note-009"], backlinks: ["note-006", "note-009", "note-014"], wordCount: 870, lastModified: new Date(now - day * 5).toISOString(), isStructureNote: false, trustState: "canonical" },
    ];
  }

  getVaultConfig(userId: string): ObsidianVaultConfig | null {
    return this.vaultConfigs.get(userId) ?? null;
  }

  updateVaultConfig(userId: string, data: UpdateVaultConfig): ObsidianVaultConfig {
    const existing = this.vaultConfigs.get(userId);
    if (!existing) throw new Error("No vault config found");
    const updated = { ...existing, ...data };
    this.vaultConfigs.set(userId, updated);
    return updated;
  }

  getVaultNotes(userId: string): VaultNote[] {
    return this.vaultNotes.get(userId) ?? [];
  }

  getVaultNote(userId: string, noteId: string): VaultNote | undefined {
    const notes = this.vaultNotes.get(userId);
    return notes?.find(n => n.id === noteId);
  }

  getContextSessions(userId: string): ContextSession[] {
    return this.contextSessions.get(userId) ?? [];
  }

  installObsidianSkill(userId: string, vaultPath: string, syncMethod: ObsidianVaultConfig["syncMethod"]): ObsidianVaultConfig {
    // Mark skill as installed
    const skill = this.skillMarketplace.find(s => s.id === "skill-013");
    if (skill) {
      skill.installed = true;
      skill.downloads += 1;
    }
    // Initialize vault data
    this.initializeVaultData(userId, vaultPath, syncMethod);
    this.addAuditLog(userId, { action: "install", resource: "skill", resourceId: "skill-013", resourceName: "Obsidian Vault", details: `Connected vault at ${vaultPath}`, user: "user" });
    return this.vaultConfigs.get(userId)!;
  }

  // ---- Audit Log ----
  addAuditLog(userId: string, entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry {
    const full: AuditLogEntry = {
      ...entry,
      id: `audit-${randomUUID().slice(0, 6)}`,
      timestamp: new Date().toISOString(),
    };
    let log = this.auditLogByUser.get(userId);
    if (!log) {
      log = [];
      this.auditLogByUser.set(userId, log);
    }
    log.push(full);
    if (log.length > 500) {
      this.auditLogByUser.set(userId, log.slice(-250));
    }
    return full;
  }

  getAuditLog(userId: string, options?: { resource?: string; action?: string; limit?: number }): AuditLogEntry[] {
    const log = this.auditLogByUser.get(userId) || [];
    let entries = log.slice().sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (options?.resource) entries = entries.filter(e => e.resource === options.resource);
    if (options?.action) entries = entries.filter(e => e.action === options.action);
    if (options?.limit) entries = entries.slice(0, options.limit);
    return entries;
  }

  clearAuditLog(userId: string): void {
    this.auditLogByUser.set(userId, []);
  }

  // ---- Admin Methods ----
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  updateUserTier(userId: string, tier: SubscriptionTier): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;
    user.tier = tier;
    this.persistUserToDb(user);
    return user;
  }

  suspendUser(userId: string): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;
    user.suspended = true;
    user.suspendedAt = new Date().toISOString();
    this.persistUserToDb(user);
    return user;
  }

  unsuspendUser(userId: string): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;
    user.suspended = false;
    user.suspendedAt = null;
    this.persistUserToDb(user);
    return user;
  }

  updateUserRole(userId: string, role: "user" | "admin"): User | undefined {
    const user = this.users.get(userId);
    if (!user) return undefined;
    user.role = role;
    this.persistUserToDb(user);
    return user;
  }

  getAdminStats(): { totalUsers: number; tierBreakdown: Record<string, number>; suspendedCount: number; recentSignups: number } {
    const users = Array.from(this.users.values());
    const tierBreakdown: Record<string, number> = { free: 0, pro: 0, team: 0, enterprise: 0 };
    let suspendedCount = 0;
    let recentSignups = 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    for (const user of users) {
      tierBreakdown[user.tier] = (tierBreakdown[user.tier] || 0) + 1;
      if (user.suspended) suspendedCount++;
      if (user.createdAt > oneDayAgo) recentSignups++;
    }

    return { totalUsers: users.length, tierBreakdown, suspendedCount, recentSignups };
  }
}

export const storage = new MemStorage();
