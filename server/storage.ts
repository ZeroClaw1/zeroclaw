import { randomUUID } from "crypto";
import {
  persistUser,
  loadUsersFromDb,
  dbGetClaudeCodeConfig,
  dbUpsertClaudeCodeConfig,
  dbGetCodingTasks,
  dbUpsertCodingTask,
  dbDeleteCodingTask,
  dbGetVaultConfig,
  dbUpsertVaultConfig,
  dbDeleteVaultConfig,
  dbGetVaultNotes,
  dbUpsertVaultNote,
  dbDeleteVaultNotesByUser,
  dbGetContextSessions,
  dbUpsertContextSession,
  dbDeleteContextSessionsByUser,
  dbGetPipelines,
  dbUpsertPipeline,
  dbDeletePipeline,
  dbGetAgents,
  dbUpsertAgent,
  dbDeleteAgent,
  dbGetWorkflows,
  dbUpsertWorkflow,
  dbDeleteWorkflow,
  dbGetDeployments,
  dbUpsertDeployment,
  dbGetPlans,
  dbUpsertPlan,
  dbDeletePlan,
  dbGetDashboardSettings,
  dbUpsertDashboardSettings,
  dbGetSecrets,
  dbUpsertSecret,
  dbDeleteSecret,
  dbGetWebhooks,
  dbUpsertWebhook,
  dbDeleteWebhook,
  dbGetNotifications,
  dbUpsertNotification,
  dbMarkAllNotificationsRead,
  dbClearNotifications,
  dbGetAuditLog,
  dbInsertAuditLog,
  dbClearAuditLog,
  dbGetApiKeys,
  dbUpsertApiKey,
  dbDeleteApiKey,
  dbGetAuthEnabled,
  dbUpsertAuthEnabled,
  dbGetAgentTasks,
  dbUpsertAgentTask,
  dbDeleteAgentTask,
  dbGetActivityEvents,
  dbInsertActivityEvent,
  dbTrimActivityEvents,
  dbGetOpenClawConfig,
  dbUpsertOpenClawConfig,
  dbGetContextWindows,
  dbUpsertContextWindow,
  dbGetSubAgents,
  dbUpsertSubAgent,
  dbDeleteSubAgent,
  dbGetWorkspaceFiles,
  dbUpsertWorkspaceFile,
  dbDeleteWorkspaceFile,
  dbGetMemoryEntries,
  dbUpsertMemoryEntry,
  dbDeleteMemoryEntry,
  dbGetHandoffs,
  dbInsertHandoff,
} from "./db";
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
  ClaudeCodeConfig,
  UpdateClaudeCodeConfig,
  CodingTask,
  SubmitCodingTask,
  Team,
  TeamMember,
  TeamInvite,
  TeamRole,
  InsertTeam,
  InviteTeamMember,
  ContextWindow,
  UpdateContextWindow,
  SubAgent,
  SubAgentStatus,
  SpawnSubAgent,
  SharedWorkspaceFile,
  CreateWorkspaceFile,
  AgentMemoryEntry,
  CreateMemoryEntry,
  ContextHandoff,
  OrchestrationStats,
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

  // Claude Code
  getClaudeCodeConfig(userId: string): ClaudeCodeConfig | null;
  getClaudeCodeConfigRaw(userId: string): ClaudeCodeConfig | null;
  updateClaudeCodeConfig(userId: string, data: UpdateClaudeCodeConfig): ClaudeCodeConfig;
  getCodingTasks(userId: string): CodingTask[];
  getCodingTask(userId: string, taskId: string): CodingTask | undefined;
  submitCodingTask(userId: string, task: SubmitCodingTask): CodingTask;
  updateCodingTask(userId: string, taskId: string, updates: Partial<CodingTask>): CodingTask | undefined;
  deleteCodingTask(userId: string, taskId: string): boolean;
  incrementClaudeCodeTokens(userId: string, tokens: number): void;

  // Audit Log
  addAuditLog(userId: string, entry: Omit<AuditLogEntry, "id" | "timestamp">): AuditLogEntry;
  getAuditLog(userId: string, options?: { resource?: string; action?: string; limit?: number }): AuditLogEntry[];
  clearAuditLog(userId: string): void;

  // Teams
  createTeam(ownerId: string, data: InsertTeam): Team;
  getTeam(teamId: string): Team | undefined;
  getTeamByOwner(ownerId: string): Team | undefined;
  getTeamMembers(teamId: string): TeamMember[];
  getTeamMember(teamId: string, userId: string): TeamMember | undefined;
  addTeamMember(teamId: string, userId: string, role: TeamRole, invitedBy: string): TeamMember;
  removeTeamMember(teamId: string, memberId: string): boolean;
  createTeamInvite(teamId: string, email: string, role: TeamRole, invitedBy: string): TeamInvite;
  getTeamInvitesByEmail(email: string): TeamInvite[];
  getTeamInvite(inviteId: string): TeamInvite | undefined;
  getTeamInvitesByTeam(teamId: string): TeamInvite[];
  acceptInvite(inviteId: string): TeamInvite | undefined;
  declineInvite(inviteId: string): boolean;

  // Context Orchestration
  getContextWindows(userId: string): ContextWindow[];
  getContextWindow(userId: string, id: string): ContextWindow | undefined;
  updateContextWindow(userId: string, id: string, data: UpdateContextWindow): ContextWindow | undefined;

  getSubAgents(userId: string): SubAgent[];
  getSubAgent(userId: string, id: string): SubAgent | undefined;
  spawnSubAgent(userId: string, data: SpawnSubAgent): SubAgent;
  updateSubAgentStatus(userId: string, id: string, status: SubAgentStatus, result?: string, error?: string): SubAgent | undefined;

  getWorkspaceFiles(userId: string): SharedWorkspaceFile[];
  createWorkspaceFile(userId: string, data: CreateWorkspaceFile): SharedWorkspaceFile;
  deleteWorkspaceFile(userId: string, id: string): boolean;

  getMemoryEntries(userId: string, agentId?: string): AgentMemoryEntry[];
  createMemoryEntry(userId: string, data: CreateMemoryEntry): AgentMemoryEntry;
  deleteMemoryEntry(userId: string, id: string): boolean;

  getHandoffs(userId: string): ContextHandoff[];
  createHandoff(userId: string, data: Omit<ContextHandoff, "id" | "timestamp">): ContextHandoff;

  getOrchestrationStats(userId: string): OrchestrationStats;

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

  // Claude Code data (per-user)
  private claudeCodeConfigs: Map<string, ClaudeCodeConfig> = new Map();
  private codingTasks: Map<string, CodingTask[]> = new Map();

  // Vault / Context data (per-user)
  private vaultConfigs: Map<string, ObsidianVaultConfig> = new Map();
  private vaultNotes: Map<string, VaultNote[]> = new Map();
  private contextSessions: Map<string, ContextSession[]> = new Map();

  // Teams data (global)
  private teams: Map<string, Team> = new Map();
  private teamMembers: Map<string, TeamMember> = new Map();
  private teamInvites: Map<string, TeamInvite> = new Map();

  // Context Orchestration data (per-user)
  private contextWindows: Map<string, WithUserId<ContextWindow>> = new Map();
  private subAgents: Map<string, WithUserId<SubAgent>> = new Map();
  private workspaceFiles: Map<string, WithUserId<SharedWorkspaceFile>> = new Map();
  private memoryEntries: Map<string, WithUserId<AgentMemoryEntry>> = new Map();
  private handoffs: Map<string, WithUserId<ContextHandoff>> = new Map();
  // Track which users have been seeded with orchestration data
  private orchestrationSeeded: Set<string> = new Set();

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
        // Initialize per-user config stores with defaults (will be overwritten by DB data below)
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
      // Load all other entity data from DB
      await this.loadFromDb();
    } catch (err) {
      console.error("[storage] Failed to load users from database:", err);
    }
  }

  /** Load all non-user entity data from PostgreSQL into memory */
  private async loadFromDb() {
    try {
      const userIds = Array.from(this.users.keys());
      await Promise.all(userIds.map(async (userId) => {
        try {
          // Pipelines
          const pipes = await dbGetPipelines(userId);
          for (const p of pipes) {
            this.pipelines.set(p.id, { ...p, _userId: userId });
          }

          // Agents
          const ags = await dbGetAgents(userId);
          for (const a of ags) {
            this.agents.set(a.id, { ...a, _userId: userId });
          }

          // Workflows
          const wfs = await dbGetWorkflows(userId);
          for (const w of wfs) {
            this.workflows.set(w.id, { ...w, _userId: userId });
          }

          // Deployments
          const deps = await dbGetDeployments(userId);
          for (const d of deps) {
            this.deployments.set(d.id, { ...d, _userId: userId });
          }

          // Plans
          const pls = await dbGetPlans(userId);
          for (const p of pls) {
            this.plans.set(p.id, { ...p, _userId: userId });
          }

          // OpenClaw config
          const oc = await dbGetOpenClawConfig(userId);
          if (oc) {
            this.openClawConfigs.set(userId, oc);
          }

          // Dashboard settings
          const ds = await dbGetDashboardSettings(userId);
          if (ds) {
            this.dashboardSettingsByUser.set(userId, ds);
          }

          // Notifications
          const notifs = await dbGetNotifications(userId);
          this.notificationsByUser.set(userId, notifs);

          // Activity events
          const acts = await dbGetActivityEvents(userId);
          this.activityByUser.set(userId, acts);

          // Audit log
          const audit = await dbGetAuditLog(userId);
          this.auditLogByUser.set(userId, audit);

          // API keys
          const keys = await dbGetApiKeys(userId);
          for (const k of keys) {
            this.apiKeys.set(k.id, { ...k, _userId: userId });
          }

          // Auth enabled
          const authEnabled = await dbGetAuthEnabled(userId);
          if (authEnabled !== null) {
            this.authEnabledByUser.set(userId, authEnabled);
          }

          // Secrets
          const secs = await dbGetSecrets(userId);
          for (const s of secs) {
            const { rawValue, ...secretPublic } = s;
            this.secrets.set(s.id, { ...secretPublic, rawValue, _userId: userId });
          }

          // Webhooks
          const whs = await dbGetWebhooks(userId);
          for (const w of whs) {
            this.webhooks.set(w.id, { ...w, _userId: userId });
          }

          // Agent tasks
          const atasks = await dbGetAgentTasks(userId);
          for (const t of atasks) {
            this.agentTasks.set(t.id, { ...t, _userId: userId });
          }

          // Claude code config
          const cc = await dbGetClaudeCodeConfig(userId);
          if (cc) {
            this.claudeCodeConfigs.set(userId, cc);
          }

          // Coding tasks
          const cts = await dbGetCodingTasks(userId);
          this.codingTasks.set(userId, cts);

          // Vault config
          const vc = await dbGetVaultConfig(userId);
          if (vc) {
            this.vaultConfigs.set(userId, vc);
          }

          // Vault notes
          const vns = await dbGetVaultNotes(userId);
          if (vns.length > 0) {
            this.vaultNotes.set(userId, vns);
          }

          // Context sessions
          const css = await dbGetContextSessions(userId);
          if (css.length > 0) {
            this.contextSessions.set(userId, css);
          }

          // Context windows
          const cws = await dbGetContextWindows(userId);
          for (const cw of cws) {
            this.contextWindows.set(cw.id, { ...cw, _userId: userId });
          }

          // Sub-agents
          const sas = await dbGetSubAgents(userId);
          for (const sa of sas) {
            this.subAgents.set(sa.id, { ...sa, _userId: userId });
          }

          // Workspace files
          const wfs2 = await dbGetWorkspaceFiles(userId);
          for (const wf of wfs2) {
            this.workspaceFiles.set(wf.id, { ...wf, _userId: userId });
          }

          // Memory entries
          const mes = await dbGetMemoryEntries(userId);
          for (const me of mes) {
            this.memoryEntries.set(me.id, { ...me, _userId: userId });
          }

          // Handoffs
          const hoffs = await dbGetHandoffs(userId);
          for (const h of hoffs) {
            this.handoffs.set(h.id, { ...h, _userId: userId });
          }
        } catch (err) {
          console.error(`[storage] Failed to load data for user ${userId}:`, err);
        }
      }));
      console.log(`[storage] Loaded entity data from database for ${userIds.length} user(s)`);
    } catch (err) {
      console.error("[storage] Failed to load entity data from database:", err);
    }
  }

  /** Fire-and-forget persist a user to PostgreSQL */
  private persistUserToDb(user: User) {
    persistUser(user).catch((err) => {
      console.error(`[storage] Failed to persist user ${user.id}:`, err);
    });
  }

  /** Fire-and-forget wrapper for any DB persist operation */
  private persist(label: string, fn: () => Promise<void>) {
    fn().catch((err) => {
      console.error(`[storage] Failed to persist ${label}:`, err);
    });
  }

  private seedOrchestrationForUser(userId: string) {
    if (this.orchestrationSeeded.has(userId)) return;
    this.orchestrationSeeded.add(userId);

    const now = new Date();
    const ago = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();

    const parentAgentId = "agent-orchestrator-01";
    const researchAgentId = "sub-research-01";
    const scrapeAgentId = "sub-scrape-02";
    const analysisAgentId = "sub-analysis-03";
    const activeAgentId = "sub-active-04";

    // ---- Context Windows ----
    const cwMain: ContextWindow = {
      id: randomUUID(),
      agentId: parentAgentId,
      agentName: "Orchestrator Agent",
      maxTokens: 200000,
      usedTokens: 142850,
      reservedTokens: 15000,
      healthStatus: "warning",
      compressionEnabled: true,
      autoSummarizeThreshold: 80,
      lastCompressedAt: ago(45),
      createdAt: ago(180),
      updatedAt: ago(5),
    };
    const cwResearch: ContextWindow = {
      id: randomUUID(),
      agentId: researchAgentId,
      agentName: "Research SubAgent",
      maxTokens: 100000,
      usedTokens: 87340,
      reservedTokens: 8000,
      healthStatus: "critical",
      compressionEnabled: true,
      autoSummarizeThreshold: 75,
      lastCompressedAt: ago(20),
      createdAt: ago(90),
      updatedAt: ago(2),
    };
    const cwAnalysis: ContextWindow = {
      id: randomUUID(),
      agentId: analysisAgentId,
      agentName: "Analysis SubAgent",
      maxTokens: 100000,
      usedTokens: 34200,
      reservedTokens: 8000,
      healthStatus: "healthy",
      compressionEnabled: false,
      autoSummarizeThreshold: 85,
      lastCompressedAt: null,
      createdAt: ago(60),
      updatedAt: ago(15),
    };
    const cwActive: ContextWindow = {
      id: randomUUID(),
      agentId: activeAgentId,
      agentName: "Pricing Analyst SubAgent",
      maxTokens: 100000,
      usedTokens: 12400,
      reservedTokens: 8000,
      healthStatus: "healthy",
      compressionEnabled: false,
      autoSummarizeThreshold: 85,
      lastCompressedAt: null,
      createdAt: ago(3),
      updatedAt: ago(1),
    };
    for (const cw of [cwMain, cwResearch, cwAnalysis, cwActive]) {
      this.contextWindows.set(cw.id, { ...cw, _userId: userId });
    }

    // ---- Sub-agents ----
    const saResearch: SubAgent = {
      id: researchAgentId,
      parentAgentId,
      agentName: "Research SubAgent",
      objective: "Research top 5 competitor products, their features, pricing, and market positioning. Write findings to workspace/research/competitors.json.",
      status: "completed",
      model: "claude-sonnet-4-6",
      inputTokens: 54200,
      outputTokens: 33140,
      workspaceFiles: ["research/competitors.json", "research/competitor-summary.md"],
      result: "Identified 5 key competitors: Temporal, Windmill, Prefect, Dagster, Airflow. Full details saved to research/competitors.json. Key insight: all competitors lack real-time agent context management — strong differentiator for ZeroClaw.",
      error: null,
      spawnedAt: ago(90),
      completedAt: ago(35),
      duration: 3300,
    };
    const saScrape: SubAgent = {
      id: scrapeAgentId,
      parentAgentId,
      agentName: "Data Collection SubAgent",
      objective: "Fetch pricing pages and feature matrices from competitor websites. Save structured data to workspace/research/pricing_data.json.",
      status: "completed",
      model: "claude-haiku-3-5",
      inputTokens: 28900,
      outputTokens: 18450,
      workspaceFiles: ["research/pricing_data.json"],
      result: "Collected pricing data from 5 competitor sites. Temporal: $0.10/exec, Windmill: free/cloud $10/mo, Prefect: free/$500/mo, Dagster: open-source/cloud $0.002/compute-min, Airflow: self-hosted only. Data in research/pricing_data.json.",
      error: null,
      spawnedAt: ago(85),
      completedAt: ago(50),
      duration: 2100,
    };
    const saAnalysis: SubAgent = {
      id: analysisAgentId,
      parentAgentId,
      agentName: "Analysis SubAgent",
      objective: "Synthesize competitor research into a SWOT analysis and strategic recommendations. Output to workspace/analysis/strategic_report.md.",
      status: "completed",
      model: "claude-opus-4-5",
      inputTokens: 22400,
      outputTokens: 11800,
      workspaceFiles: ["analysis/strategic_report.md", "analysis/swot_matrix.json"],
      result: "SWOT analysis complete. ZeroClaw's agent context management and real-time orchestration dashboard are unique strengths. Primary risk: developer adoption curve. Recommend focusing on developer experience and one-click integrations. Full report at analysis/strategic_report.md.",
      error: null,
      spawnedAt: ago(60),
      completedAt: ago(22),
      duration: 2280,
    };
    const saActive: SubAgent = {
      id: activeAgentId,
      parentAgentId,
      agentName: "Pricing Analyst SubAgent",
      objective: "Model competitive pricing scenarios using the collected data. Propose 3 pricing tiers that maximize conversion and LTV.",
      status: "running",
      model: "claude-sonnet-4-6",
      inputTokens: 8200,
      outputTokens: 4200,
      workspaceFiles: [],
      result: null,
      error: null,
      spawnedAt: ago(3),
      completedAt: null,
      duration: 0,
    };
    for (const sa of [saResearch, saScrape, saAnalysis, saActive]) {
      this.subAgents.set(sa.id, { ...sa, _userId: userId });
    }

    // ---- Workspace Files ----
    const wsFiles: SharedWorkspaceFile[] = [
      {
        id: randomUUID(),
        path: "research/competitors.json",
        name: "competitors.json",
        type: "data",
        size: 18420,
        createdBy: researchAgentId,
        lastAccessedBy: analysisAgentId,
        accessCount: 4,
        createdAt: ago(35),
        updatedAt: ago(22),
      },
      {
        id: randomUUID(),
        path: "research/competitor-summary.md",
        name: "competitor-summary.md",
        type: "result",
        size: 5240,
        createdBy: researchAgentId,
        lastAccessedBy: parentAgentId,
        accessCount: 6,
        createdAt: ago(35),
        updatedAt: ago(35),
      },
      {
        id: randomUUID(),
        path: "research/pricing_data.json",
        name: "pricing_data.json",
        type: "data",
        size: 9870,
        createdBy: scrapeAgentId,
        lastAccessedBy: analysisAgentId,
        accessCount: 3,
        createdAt: ago(50),
        updatedAt: ago(50),
      },
      {
        id: randomUUID(),
        path: "analysis/strategic_report.md",
        name: "strategic_report.md",
        type: "result",
        size: 12800,
        createdBy: analysisAgentId,
        lastAccessedBy: parentAgentId,
        accessCount: 2,
        createdAt: ago(22),
        updatedAt: ago(22),
      },
      {
        id: randomUUID(),
        path: "analysis/swot_matrix.json",
        name: "swot_matrix.json",
        type: "result",
        size: 3140,
        createdBy: analysisAgentId,
        lastAccessedBy: parentAgentId,
        accessCount: 1,
        createdAt: ago(22),
        updatedAt: ago(22),
      },
      {
        id: randomUUID(),
        path: "config/orchestrator.json",
        name: "orchestrator.json",
        type: "config",
        size: 820,
        createdBy: parentAgentId,
        lastAccessedBy: parentAgentId,
        accessCount: 12,
        createdAt: ago(180),
        updatedAt: ago(5),
      },
    ];
    for (const wf of wsFiles) {
      this.workspaceFiles.set(wf.id, { ...wf, _userId: userId });
    }

    // ---- Memory Entries ----
    const memEntries: AgentMemoryEntry[] = [
      {
        id: randomUUID(),
        agentId: parentAgentId,
        memoryType: "project",
        content: "ZeroClaw competitive analysis project: researching top 5 orchestration competitors. Parent task: build pricing strategy for launch.",
        source: "task-init-001",
        confidence: 0.98,
        accessCount: 8,
        lastAccessed: ago(5),
        createdAt: ago(180),
        expiresAt: null,
      },
      {
        id: randomUUID(),
        agentId: parentAgentId,
        memoryType: "fact",
        content: "Key competitors: Temporal (workflow orchestration), Windmill (open-source), Prefect (dataflow), Dagster (data platform), Airflow (legacy pipeline). None offer real-time agent context management UI.",
        source: "sub-research-01:result",
        confidence: 0.95,
        accessCount: 5,
        lastAccessed: ago(22),
        createdAt: ago(35),
        expiresAt: null,
      },
      {
        id: randomUUID(),
        agentId: parentAgentId,
        memoryType: "fact",
        content: "Competitor pricing range: free tier (Windmill, Dagster) to $500/mo enterprise (Prefect). Most charge per compute-minute or per execution. ZeroClaw should price on agent-seats + context tokens.",
        source: "sub-scrape-02:result",
        confidence: 0.92,
        accessCount: 3,
        lastAccessed: ago(22),
        createdAt: ago(50),
        expiresAt: null,
      },
      {
        id: randomUUID(),
        agentId: researchAgentId,
        memoryType: "fact",
        content: "Temporal.io: Go-based workflow engine, strong developer community, $0.10 per workflow execution on cloud. No UI for agent context monitoring.",
        source: "web-research-session",
        confidence: 0.90,
        accessCount: 2,
        lastAccessed: ago(40),
        createdAt: ago(80),
        expiresAt: null,
      },
      {
        id: randomUUID(),
        agentId: researchAgentId,
        memoryType: "fact",
        content: "Prefect: Python-first, strong data engineering focus, 2.0 is open source, cloud offering at $500/mo for teams. Not AI-agent focused.",
        source: "web-research-session",
        confidence: 0.88,
        accessCount: 2,
        lastAccessed: ago(38),
        createdAt: ago(78),
        expiresAt: null,
      },
      {
        id: randomUUID(),
        agentId: analysisAgentId,
        memoryType: "project",
        content: "SWOT analysis task: synthesize research/competitors.json and research/pricing_data.json into strategic recommendations for ZeroClaw launch positioning.",
        source: "task-handoff-from-orchestrator",
        confidence: 0.97,
        accessCount: 4,
        lastAccessed: ago(22),
        createdAt: ago(60),
        expiresAt: null,
      },
      {
        id: randomUUID(),
        agentId: parentAgentId,
        memoryType: "preference",
        content: "User prefers concise executive summaries (< 500 words) with bullet points over long prose. Prioritize actionable recommendations.",
        source: "user-feedback-session",
        confidence: 0.85,
        accessCount: 6,
        lastAccessed: ago(10),
        createdAt: ago(120),
        expiresAt: null,
      },
      {
        id: randomUUID(),
        agentId: parentAgentId,
        memoryType: "conversation",
        content: "Previous conversation: user asked for competitor analysis. Delegated to 3 subagents. User expressed satisfaction with Research SubAgent output. Currently running pricing analysis.",
        source: "conversation-2025-03-19",
        confidence: 0.80,
        accessCount: 3,
        lastAccessed: ago(3),
        createdAt: ago(90),
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: randomUUID(),
        agentId: activeAgentId,
        memoryType: "project",
        content: "Pricing model task: use analysis/strategic_report.md and research/pricing_data.json to propose 3 pricing tiers optimized for developer-first adoption and SaaS LTV.",
        source: "task-handoff-from-orchestrator",
        confidence: 0.97,
        accessCount: 2,
        lastAccessed: ago(2),
        createdAt: ago(3),
        expiresAt: null,
      },
    ];
    for (const me of memEntries) {
      this.memoryEntries.set(me.id, { ...me, _userId: userId });
    }

    // ---- Handoffs ----
    const handoffsList: ContextHandoff[] = [
      {
        id: randomUUID(),
        fromAgentId: parentAgentId,
        toAgentId: researchAgentId,
        handoffType: "delegation",
        tokensBefore: 45200,
        tokensAfter: 3800,
        tokensSaved: 41400,
        payload: "Delegating competitor research task. Objective: research top 5 orchestration competitors. Write findings to workspace/research/. Parent context summarized and attached.",
        success: true,
        timestamp: ago(90),
      },
      {
        id: randomUUID(),
        fromAgentId: parentAgentId,
        toAgentId: scrapeAgentId,
        handoffType: "delegation",
        tokensBefore: 46800,
        tokensAfter: 4200,
        tokensSaved: 42600,
        payload: "Delegating pricing data collection. Fetch competitor pricing pages and save to workspace/research/pricing_data.json. Context window compressed prior to handoff.",
        success: true,
        timestamp: ago(85),
      },
      {
        id: randomUUID(),
        fromAgentId: researchAgentId,
        toAgentId: parentAgentId,
        handoffType: "result",
        tokensBefore: 87340,
        tokensAfter: 8200,
        tokensSaved: 79140,
        payload: "Research complete. 5 competitors identified and profiled. Key finding: no competitor offers real-time agent context UI. Files: research/competitors.json, research/competitor-summary.md",
        success: true,
        timestamp: ago(35),
      },
      {
        id: randomUUID(),
        fromAgentId: analysisAgentId,
        toAgentId: parentAgentId,
        handoffType: "result",
        tokensBefore: 34200,
        tokensAfter: 5100,
        tokensSaved: 29100,
        payload: "SWOT analysis complete. Strategic recommendation: launch with developer-first free tier, differentiate on context management UI. Files: analysis/strategic_report.md, analysis/swot_matrix.json",
        success: true,
        timestamp: ago(22),
      },
      {
        id: randomUUID(),
        fromAgentId: parentAgentId,
        toAgentId: activeAgentId,
        handoffType: "delegation",
        tokensBefore: 142850,
        tokensAfter: 9600,
        tokensSaved: 133250,
        payload: "Delegating pricing tier design. Use collected research to propose 3 pricing tiers. Context compressed using auto-summarize (threshold: 80%). Key context summary attached.",
        success: true,
        timestamp: ago(3),
      },
    ];
    for (const h of handoffsList) {
      this.handoffs.set(h.id, { ...h, _userId: userId });
    }
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
    this.persist("openClawConfig", () => dbUpsertOpenClawConfig(id, { ...DEFAULT_OPENCLAW_CONFIG }));
    this.persist("dashboardSettings", () => dbUpsertDashboardSettings(id, { ...DEFAULT_DASHBOARD_SETTINGS, widgetLayout: [...DEFAULT_DASHBOARD_SETTINGS.widgetLayout!] }));
    this.persist("authEnabled", () => dbUpsertAuthEnabled(id, false));
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
    this.persist("pipeline", () => dbUpsertPipeline(userId, pipeline));
    this.addActivity(userId, { type: "pipeline", message: `Pipeline "${pipeline.name}" created on ${pipeline.branch}`, status: "pending" });
    this.addAuditLog(userId, { action: "create", resource: "pipeline", resourceId: id, resourceName: pipeline.name, details: `Created on branch ${pipeline.branch}`, user: pipeline.author });
    return pipeline;
  }

  updatePipelineStatus(userId: string, id: string, status: Pipeline["status"]): Pipeline | undefined {
    const pipeline = this.pipelines.get(id);
    if (!pipeline || pipeline._userId !== userId) return undefined;
    pipeline.status = status;
    this.pipelines.set(id, pipeline);
    this.persist("pipeline", () => dbUpsertPipeline(userId, pipeline));
    return pipeline;
  }

  deletePipeline(userId: string, id: string): boolean {
    const pipeline = this.pipelines.get(id);
    if (!pipeline || pipeline._userId !== userId) return false;
    this.addActivity(userId, { type: "pipeline", message: `Pipeline "${pipeline.name}" deleted`, status: "cancelled" });
    this.addAuditLog(userId, { action: "delete", resource: "pipeline", resourceId: id, resourceName: pipeline.name, details: "Pipeline deleted", user: "user" });
    this.persist("pipeline delete", () => dbDeletePipeline(userId, id));
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
    this.persist("agent", () => dbUpsertAgent(userId, agent));
    this.addActivity(userId, { type: "agent", message: `Agent "${agent.name}" registered (${agent.model})`, status: "offline" });
    this.addAuditLog(userId, { action: "create", resource: "agent", resourceId: id, resourceName: agent.name, details: `Registered with model ${agent.model}`, user: "user" });
    return agent;
  }

  updateAgent(userId: string, id: string, data: Partial<Agent>): Agent | undefined {
    const agent = this.agents.get(id);
    if (!agent || agent._userId !== userId) return undefined;
    const updated: WithUserId<Agent> = { ...agent, ...data, id: agent.id, _userId: userId };
    this.agents.set(id, updated);
    this.persist("agent", () => dbUpsertAgent(userId, updated));
    return updated;
  }

  deleteAgent(userId: string, id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent || agent._userId !== userId) return false;
    this.addActivity(userId, { type: "agent", message: `Agent "${agent.name}" removed`, status: "offline" });
    this.addAuditLog(userId, { action: "delete", resource: "agent", resourceId: id, resourceName: agent.name, details: "Agent removed", user: "user" });
    this.persist("agent delete", () => dbDeleteAgent(userId, id));
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
    this.persist("workflow", () => dbUpsertWorkflow(userId, workflow));
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
    this.persist("workflow", () => dbUpsertWorkflow(userId, updated));
    return updated;
  }

  deleteWorkflow(userId: string, id: string): boolean {
    const workflow = this.workflows.get(id);
    if (!workflow || workflow._userId !== userId) return false;
    this.addActivity(userId, { type: "openclaw", message: `Workflow "${workflow.name}" deleted`, status: "cancelled" });
    this.persist("workflow delete", () => dbDeleteWorkflow(userId, id));
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
    this.persist("deployment", () => dbUpsertDeployment(userId, deployment));
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
      this.persist("deployment", () => dbUpsertDeployment(userId, deployment));
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
    this.persist("deployment", () => dbUpsertDeployment(userId, deployment));
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
      this.persist("activity trim", () => dbTrimActivityEvents(userId));
    }
    this.persist("activity", () => dbInsertActivityEvent(userId, full));
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
    this.persist("openClawConfig", () => dbUpsertOpenClawConfig(userId, config!));
    return { ...config };
  }

  setOpenClawConnected(userId: string, connected: boolean): void {
    let config = this.openClawConfigs.get(userId);
    if (!config) {
      config = { ...DEFAULT_OPENCLAW_CONFIG };
      this.openClawConfigs.set(userId, config);
    }
    config.connected = connected;
    this.persist("openClawConfig", () => dbUpsertOpenClawConfig(userId, config!));
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
    this.persist("plan", () => dbUpsertPlan(userId, plan));
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
    this.persist("plan", () => dbUpsertPlan(userId, updated));
    return updated;
  }

  deletePlan(userId: string, id: string): boolean {
    const plan = this.plans.get(id);
    if (!plan || plan._userId !== userId) return false;
    this.addActivity(userId, { type: "openclaw", message: `Plan "${plan.title}" deleted`, status: "cancelled" });
    this.persist("plan delete", () => dbDeletePlan(userId, id));
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
    this.persist("notification", () => dbUpsertNotification(userId, notification));
    return notification;
  }

  markAllRead(userId: string): void {
    const notifs = this.notificationsByUser.get(userId) || [];
    notifs.forEach((n) => { n.read = true; });
    this.persist("notifications markAllRead", () => dbMarkAllNotificationsRead(userId));
  }

  clearNotifications(userId: string): void {
    this.notificationsByUser.set(userId, []);
    this.persist("notifications clear", () => dbClearNotifications(userId));
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
    this.persist("dashboardSettings", () => dbUpsertDashboardSettings(userId, settings!));
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
    this.persist("apiKey", () => dbUpsertApiKey(userId, { ...apiKey, rawKey: raw }));
    this.addActivity(userId, { type: "openclaw", message: `API key "${data.name}" created`, status: "success" });
    return { apiKey, rawKey: raw };
  }

  deleteApiKey(userId: string, id: string): boolean {
    const entry = this.apiKeys.get(id);
    if (!entry || entry._userId !== userId) return false;
    this.addActivity(userId, { type: "openclaw", message: `API key "${entry.name}" revoked`, status: "cancelled" });
    this.persist("apiKey delete", () => dbDeleteApiKey(userId, id));
    return this.apiKeys.delete(id);
  }

  isAuthEnabled(userId: string): boolean {
    return this.authEnabledByUser.get(userId) || false;
  }

  setAuthEnabled(userId: string, enabled: boolean): void {
    this.authEnabledByUser.set(userId, enabled);
    this.persist("authEnabled", () => dbUpsertAuthEnabled(userId, enabled));
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
    this.persist("secret", () => dbUpsertSecret(userId, { ...secret, rawValue: data.value }));
    this.addAuditLog(userId, { action: "create", resource: "secret", resourceId: id, resourceName: data.name, details: `Scope: ${secret.scope}`, user: "user" });
    return { secret, rawValue: data.value };
  }

  deleteSecret(userId: string, id: string): boolean {
    const entry = this.secrets.get(id);
    if (!entry || entry._userId !== userId) return false;
    this.addAuditLog(userId, { action: "delete", resource: "secret", resourceId: id, resourceName: entry.name, details: "Secret deleted", user: "user" });
    this.persist("secret delete", () => dbDeleteSecret(userId, id));
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
    this.persist("webhook", () => dbUpsertWebhook(userId, webhook));
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
    this.persist("webhook", () => dbUpsertWebhook(userId, updated));
    return updated;
  }

  deleteWebhook(userId: string, id: string): boolean {
    const webhook = this.webhooks.get(id);
    if (!webhook || webhook._userId !== userId) return false;
    this.addAuditLog(userId, { action: "delete", resource: "webhook", resourceId: id, resourceName: webhook.name, details: "Webhook deleted", user: "user" });
    this.persist("webhook delete", () => dbDeleteWebhook(userId, id));
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
    this.persist("agentTask", () => dbUpsertAgentTask(userId, task));
    this.addAuditLog(userId, { action: "create", resource: "agent", resourceId: id, resourceName: task.title, details: `Task assigned to agent ${data.agentId}`, user: "user" });
    return task;
  }

  updateAgentTask(userId: string, id: string, data: Partial<AgentTask>): AgentTask | undefined {
    const task = this.agentTasks.get(id);
    if (!task || task._userId !== userId) return undefined;
    const updated: WithUserId<AgentTask> = { ...task, ...data, id: task.id, _userId: userId };
    this.agentTasks.set(id, updated);
    this.persist("agentTask", () => dbUpsertAgentTask(userId, updated));
    return updated;
  }

  deleteAgentTask(userId: string, id: string): boolean {
    const task = this.agentTasks.get(id);
    if (!task || task._userId !== userId) return false;
    this.persist("agentTask delete", () => dbDeleteAgentTask(userId, id));
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
      this.persist("agent", () => dbUpsertAgent(userId, agent));
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
    this.persist("agent", () => dbUpsertAgent(userId, agent));
    // If uninstalling Obsidian Vault skill, clear vault data
    if (id === "skill-013") {
      this.vaultConfigs.delete(userId);
      this.vaultNotes.delete(userId);
      this.contextSessions.delete(userId);
      this.persist("vaultConfig delete", () => dbDeleteVaultConfig(userId));
      this.persist("vaultNotes delete", () => dbDeleteVaultNotesByUser(userId));
      this.persist("contextSessions delete", () => dbDeleteContextSessionsByUser(userId));
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
    this.persist("vaultConfig delete", () => dbDeleteVaultConfig(userId));
    this.persist("vaultNotes delete", () => dbDeleteVaultNotesByUser(userId));
    this.persist("contextSessions delete", () => dbDeleteContextSessionsByUser(userId));
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

    const demoSessions = [
      { id: "ctx-001", agentId: "agent-1", notesLoaded: 8, tokensUsed: 12400, tokenBudget: 32000, retrievalHits: 23, startedAt: new Date(Date.now() - 3600000).toISOString(), status: "active" as const },
      { id: "ctx-002", agentId: "agent-2", notesLoaded: 3, tokensUsed: 4200, tokenBudget: 32000, retrievalHits: 7, startedAt: new Date(Date.now() - 7200000).toISOString(), status: "idle" as const },
      { id: "ctx-003", agentId: "agent-3", notesLoaded: 12, tokensUsed: 28900, tokenBudget: 32000, retrievalHits: 45, startedAt: new Date(Date.now() - 86400000).toISOString(), status: "expired" as const },
    ];
    // Create demo context sessions
    this.contextSessions.set(userId, demoSessions);
    // Persist to DB
    this.persist("vaultConfig", () => dbUpsertVaultConfig(userId, config));
    for (const note of notes) {
      this.persist("vaultNote", () => dbUpsertVaultNote(userId, note));
    }
    for (const session of demoSessions) {
      this.persist("contextSession", () => dbUpsertContextSession(userId, session));
    }
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
    this.persist("vaultConfig", () => dbUpsertVaultConfig(userId, updated));
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
    // Initialize vault data (also persists to DB)
    this.initializeVaultData(userId, vaultPath, syncMethod);
    this.addAuditLog(userId, { action: "install", resource: "skill", resourceId: "skill-013", resourceName: "Obsidian Vault", details: `Connected vault at ${vaultPath}`, user: "user" });
    return this.vaultConfigs.get(userId)!;
  }

  // ---- Claude Code ----
  getClaudeCodeConfig(userId: string): ClaudeCodeConfig | null {
    return this.claudeCodeConfigs.get(userId) ?? null;
  }

  getClaudeCodeConfigRaw(userId: string): ClaudeCodeConfig | null {
    return this.claudeCodeConfigs.get(userId) ?? null;
  }

  updateClaudeCodeConfig(userId: string, data: UpdateClaudeCodeConfig): ClaudeCodeConfig {
    let config = this.claudeCodeConfigs.get(userId);
    if (!config) {
      config = {
        id: `cc-${randomUUID().slice(0, 8)}`,
        authMethod: "api_key",
        apiKey: "",
        oauthToken: "",
        model: "claude-sonnet-4-20250514",
        maxTokens: 8192,
        status: "disconnected",
        lastUsed: null,
        totalTasks: 0,
        totalTokensUsed: 0,
        useObsidianContext: false,
        allowedTools: ["Read", "Edit", "Bash", "Write"],
        systemPrompt: "",
      };
      this.claudeCodeConfigs.set(userId, config);
    }
    if (data.authMethod !== undefined) config.authMethod = data.authMethod;
    if (data.apiKey !== undefined) {
      config.apiKey = data.apiKey;
      // Update status based on active auth method
      if (config.authMethod === "api_key") {
        config.status = data.apiKey ? "connected" : "disconnected";
      }
    }
    if (data.oauthToken !== undefined) {
      config.oauthToken = data.oauthToken;
      if (config.authMethod === "oauth_token") {
        config.status = data.oauthToken ? "connected" : "disconnected";
      }
    }
    if (data.model !== undefined) config.model = data.model;
    if (data.maxTokens !== undefined) config.maxTokens = data.maxTokens;
    if (data.useObsidianContext !== undefined) config.useObsidianContext = data.useObsidianContext;
    if (data.allowedTools !== undefined) config.allowedTools = data.allowedTools;
    if (data.systemPrompt !== undefined) config.systemPrompt = data.systemPrompt;
    this.persist("claudeCodeConfig", () => dbUpsertClaudeCodeConfig(userId, config!));
    return { ...config };
  }

  getCodingTasks(userId: string): CodingTask[] {
    return (this.codingTasks.get(userId) ?? []).slice().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getCodingTask(userId: string, taskId: string): CodingTask | undefined {
    const tasks = this.codingTasks.get(userId) ?? [];
    return tasks.find(t => t.id === taskId);
  }

  submitCodingTask(userId: string, task: SubmitCodingTask): CodingTask {
    const config = this.claudeCodeConfigs.get(userId);
    const id = `ctask-${randomUUID().slice(0, 8)}`;
    const codingTask: CodingTask = {
      id,
      title: task.title,
      prompt: task.prompt,
      status: "queued",
      model: config?.model || "claude-sonnet-4-20250514",
      response: null,
      tokensUsed: 0,
      contextNotes: task.contextNoteIds || [],
      createdAt: new Date().toISOString(),
      completedAt: null,
      error: null,
    };
    let tasks = this.codingTasks.get(userId);
    if (!tasks) {
      tasks = [];
      this.codingTasks.set(userId, tasks);
    }
    tasks.push(codingTask);
    this.persist("codingTask", () => dbUpsertCodingTask(userId, codingTask));

    // Update config stats
    if (config) {
      config.totalTasks += 1;
      config.lastUsed = new Date().toISOString();
      this.persist("claudeCodeConfig", () => dbUpsertClaudeCodeConfig(userId, config!));
    }

    return codingTask;
  }

  updateCodingTask(userId: string, taskId: string, updates: Partial<CodingTask>): CodingTask | undefined {
    const tasks = this.codingTasks.get(userId) ?? [];
    const task = tasks.find(t => t.id === taskId);
    if (!task) return undefined;
    Object.assign(task, updates);
    this.persist("codingTask", () => dbUpsertCodingTask(userId, task));
    return { ...task };
  }

  deleteCodingTask(userId: string, taskId: string): boolean {
    const tasks = this.codingTasks.get(userId);
    if (!tasks) return false;
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return false;
    tasks.splice(idx, 1);
    this.persist("codingTask delete", () => dbDeleteCodingTask(userId, taskId));
    return true;
  }

  incrementClaudeCodeTokens(userId: string, tokens: number): void {
    const config = this.claudeCodeConfigs.get(userId);
    if (config) {
      config.totalTokensUsed += tokens;
      this.persist("claudeCodeConfig", () => dbUpsertClaudeCodeConfig(userId, config));
    }
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
    this.persist("auditLog", () => dbInsertAuditLog(userId, full));
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
    this.persist("auditLog clear", () => dbClearAuditLog(userId));
  }

  // ---- Context Orchestration Methods ----

  getContextWindows(userId: string): ContextWindow[] {
    this.seedOrchestrationForUser(userId);
    return Array.from(this.contextWindows.values())
      .filter((cw) => cw._userId === userId)
      .map(({ _userId, ...cw }) => cw as ContextWindow)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getContextWindow(userId: string, id: string): ContextWindow | undefined {
    this.seedOrchestrationForUser(userId);
    const cw = this.contextWindows.get(id);
    if (!cw || cw._userId !== userId) return undefined;
    const { _userId, ...rest } = cw;
    return rest as ContextWindow;
  }

  updateContextWindow(userId: string, id: string, data: UpdateContextWindow): ContextWindow | undefined {
    this.seedOrchestrationForUser(userId);
    const cw = this.contextWindows.get(id);
    if (!cw || cw._userId !== userId) return undefined;
    if (data.maxTokens !== undefined) cw.maxTokens = data.maxTokens;
    if (data.compressionEnabled !== undefined) cw.compressionEnabled = data.compressionEnabled;
    if (data.autoSummarizeThreshold !== undefined) cw.autoSummarizeThreshold = data.autoSummarizeThreshold;
    cw.updatedAt = new Date().toISOString();
    // Recompute health status
    const utilization = cw.usedTokens / cw.maxTokens;
    if (utilization >= 0.95) cw.healthStatus = "overflow";
    else if (utilization >= 0.85) cw.healthStatus = "critical";
    else if (utilization >= 0.70) cw.healthStatus = "warning";
    else cw.healthStatus = "healthy";
    this.contextWindows.set(id, cw);
    this.persist("contextWindow", () => dbUpsertContextWindow(userId, cw));
    const { _userId, ...rest } = cw;
    return rest as ContextWindow;
  }

  getSubAgents(userId: string): SubAgent[] {
    this.seedOrchestrationForUser(userId);
    return Array.from(this.subAgents.values())
      .filter((sa) => sa._userId === userId)
      .map(({ _userId, ...sa }) => sa as SubAgent)
      .sort((a, b) => new Date(b.spawnedAt).getTime() - new Date(a.spawnedAt).getTime());
  }

  getSubAgent(userId: string, id: string): SubAgent | undefined {
    this.seedOrchestrationForUser(userId);
    const sa = this.subAgents.get(id);
    if (!sa || sa._userId !== userId) return undefined;
    const { _userId, ...rest } = sa;
    return rest as SubAgent;
  }

  spawnSubAgent(userId: string, data: SpawnSubAgent): SubAgent {
    this.seedOrchestrationForUser(userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const sa: SubAgent = {
      id,
      parentAgentId: data.parentAgentId,
      agentName: data.agentName,
      objective: data.objective,
      status: "spawning",
      model: data.model,
      inputTokens: 0,
      outputTokens: 0,
      workspaceFiles: [],
      result: null,
      error: null,
      spawnedAt: now,
      completedAt: null,
      duration: 0,
    };
    this.subAgents.set(id, { ...sa, _userId: userId });
    // Auto-create a context window for this subagent
    const cwId = randomUUID();
    const cw: ContextWindow = {
      id: cwId,
      agentId: id,
      agentName: data.agentName,
      maxTokens: 100000,
      usedTokens: 0,
      reservedTokens: 8000,
      healthStatus: "healthy",
      compressionEnabled: false,
      autoSummarizeThreshold: 85,
      lastCompressedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.contextWindows.set(cwId, { ...cw, _userId: userId });
    this.persist("subAgent", () => dbUpsertSubAgent(userId, sa));
    this.persist("contextWindow", () => dbUpsertContextWindow(userId, cw));
    return sa;
  }

  updateSubAgentStatus(userId: string, id: string, status: SubAgentStatus, result?: string, error?: string): SubAgent | undefined {
    this.seedOrchestrationForUser(userId);
    const sa = this.subAgents.get(id);
    if (!sa || sa._userId !== userId) return undefined;
    sa.status = status;
    if (result !== undefined) sa.result = result;
    if (error !== undefined) sa.error = error;
    if (status === "completed" || status === "failed" || status === "cancelled") {
      sa.completedAt = new Date().toISOString();
      sa.duration = Math.round((new Date(sa.completedAt).getTime() - new Date(sa.spawnedAt).getTime()) / 1000);
    }
    this.subAgents.set(id, sa);
    this.persist("subAgent", () => dbUpsertSubAgent(userId, sa));
    const { _userId, ...rest } = sa;
    return rest as SubAgent;
  }

  getWorkspaceFiles(userId: string): SharedWorkspaceFile[] {
    this.seedOrchestrationForUser(userId);
    return Array.from(this.workspaceFiles.values())
      .filter((wf) => wf._userId === userId)
      .map(({ _userId, ...wf }) => wf as SharedWorkspaceFile)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  createWorkspaceFile(userId: string, data: CreateWorkspaceFile): SharedWorkspaceFile {
    this.seedOrchestrationForUser(userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const wf: SharedWorkspaceFile = {
      id,
      path: data.path,
      name: data.name,
      type: data.type,
      size: data.size,
      createdBy: data.createdBy,
      lastAccessedBy: data.createdBy,
      accessCount: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.workspaceFiles.set(id, { ...wf, _userId: userId });
    this.persist("workspaceFile", () => dbUpsertWorkspaceFile(userId, wf));
    return wf;
  }

  deleteWorkspaceFile(userId: string, id: string): boolean {
    this.seedOrchestrationForUser(userId);
    const wf = this.workspaceFiles.get(id);
    if (!wf || wf._userId !== userId) return false;
    this.workspaceFiles.delete(id);
    this.persist("workspaceFile delete", () => dbDeleteWorkspaceFile(userId, id));
    return true;
  }

  getMemoryEntries(userId: string, agentId?: string): AgentMemoryEntry[] {
    this.seedOrchestrationForUser(userId);
    let entries = Array.from(this.memoryEntries.values())
      .filter((me) => me._userId === userId)
      .map(({ _userId, ...me }) => me as AgentMemoryEntry);
    if (agentId) entries = entries.filter((me) => me.agentId === agentId);
    return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createMemoryEntry(userId: string, data: CreateMemoryEntry): AgentMemoryEntry {
    this.seedOrchestrationForUser(userId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const me: AgentMemoryEntry = {
      id,
      agentId: data.agentId,
      memoryType: data.memoryType,
      content: data.content,
      source: data.source,
      confidence: data.confidence,
      accessCount: 0,
      lastAccessed: now,
      createdAt: now,
      expiresAt: null,
    };
    this.memoryEntries.set(id, { ...me, _userId: userId });
    this.persist("memoryEntry", () => dbUpsertMemoryEntry(userId, me));
    return me;
  }

  deleteMemoryEntry(userId: string, id: string): boolean {
    this.seedOrchestrationForUser(userId);
    const me = this.memoryEntries.get(id);
    if (!me || me._userId !== userId) return false;
    this.memoryEntries.delete(id);
    this.persist("memoryEntry delete", () => dbDeleteMemoryEntry(userId, id));
    return true;
  }

  getHandoffs(userId: string): ContextHandoff[] {
    this.seedOrchestrationForUser(userId);
    return Array.from(this.handoffs.values())
      .filter((h) => h._userId === userId)
      .map(({ _userId, ...h }) => h as ContextHandoff)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  createHandoff(userId: string, data: Omit<ContextHandoff, "id" | "timestamp">): ContextHandoff {
    this.seedOrchestrationForUser(userId);
    const id = randomUUID();
    const handoff: ContextHandoff = {
      ...data,
      id,
      timestamp: new Date().toISOString(),
    };
    this.handoffs.set(id, { ...handoff, _userId: userId });
    this.persist("handoff", () => dbInsertHandoff(userId, handoff));
    return handoff;
  }

  getOrchestrationStats(userId: string): OrchestrationStats {
    this.seedOrchestrationForUser(userId);
    const subAgentsList = Array.from(this.subAgents.values()).filter((sa) => sa._userId === userId);
    const handoffsList = Array.from(this.handoffs.values()).filter((h) => h._userId === userId);
    const workspaceFilesList = Array.from(this.workspaceFiles.values()).filter((wf) => wf._userId === userId);
    const memoryEntriesList = Array.from(this.memoryEntries.values()).filter((me) => me._userId === userId);
    const contextWindowsList = Array.from(this.contextWindows.values()).filter((cw) => cw._userId === userId);

    const activeStatuses: SubAgentStatus[] = ["spawning", "running"];
    const activeSubAgents = subAgentsList.filter((sa) => activeStatuses.includes(sa.status)).length;
    const completedSubAgents = subAgentsList.filter((sa) => sa.status === "completed").length;
    const failedSubAgents = subAgentsList.filter((sa) => sa.status === "failed").length;

    const totalTokensUsed = subAgentsList.reduce((sum, sa) => sum + sa.inputTokens + sa.outputTokens, 0);
    const totalTokensSaved = handoffsList.reduce((sum, h) => sum + h.tokensSaved, 0);

    const avgContextUtilization = contextWindowsList.length > 0
      ? Math.round(contextWindowsList.reduce((sum, cw) => sum + (cw.usedTokens / cw.maxTokens) * 100, 0) / contextWindowsList.length)
      : 0;

    return {
      totalSubAgentsSpawned: subAgentsList.length,
      activeSubAgents,
      completedSubAgents,
      failedSubAgents,
      totalTokensUsed,
      totalTokensSaved,
      avgContextUtilization,
      totalHandoffs: handoffsList.length,
      totalWorkspaceFiles: workspaceFilesList.length,
      totalMemoryEntries: memoryEntriesList.length,
    };
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

  // ---- Team Methods ----
  createTeam(ownerId: string, data: InsertTeam): Team {
    const id = randomUUID();
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const team: Team = {
      id,
      name: data.name,
      slug,
      ownerId,
      subscriptionId: null,
      createdAt: new Date().toISOString(),
    };
    this.teams.set(id, team);
    // Add owner as a member
    const memberId = randomUUID();
    const member: TeamMember = {
      id: memberId,
      teamId: id,
      userId: ownerId,
      role: "owner",
      invitedBy: ownerId,
      joinedAt: new Date().toISOString(),
    };
    this.teamMembers.set(memberId, member);
    // Update owner's teamId
    const owner = this.users.get(ownerId);
    if (owner) {
      owner.teamId = id;
      this.persistUserToDb(owner);
    }
    return team;
  }

  getTeam(teamId: string): Team | undefined {
    return this.teams.get(teamId);
  }

  getTeamByOwner(ownerId: string): Team | undefined {
    return Array.from(this.teams.values()).find(t => t.ownerId === ownerId);
  }

  getTeamMembers(teamId: string): TeamMember[] {
    return Array.from(this.teamMembers.values()).filter(m => m.teamId === teamId);
  }

  getTeamMember(teamId: string, userId: string): TeamMember | undefined {
    return Array.from(this.teamMembers.values()).find(m => m.teamId === teamId && m.userId === userId);
  }

  addTeamMember(teamId: string, userId: string, role: TeamRole, invitedBy: string): TeamMember {
    const id = randomUUID();
    const member: TeamMember = {
      id,
      teamId,
      userId,
      role,
      invitedBy,
      joinedAt: new Date().toISOString(),
    };
    this.teamMembers.set(id, member);
    const user = this.users.get(userId);
    if (user) {
      user.teamId = teamId;
      this.persistUserToDb(user);
    }
    return member;
  }

  removeTeamMember(teamId: string, memberId: string): boolean {
    const member = this.teamMembers.get(memberId);
    if (!member || member.teamId !== teamId) return false;
    this.teamMembers.delete(memberId);
    const user = this.users.get(member.userId);
    if (user) {
      user.teamId = null;
      this.persistUserToDb(user);
    }
    return true;
  }

  createTeamInvite(teamId: string, email: string, role: TeamRole, invitedBy: string): TeamInvite {
    const id = randomUUID();
    const invite: TeamInvite = {
      id,
      teamId,
      email,
      role,
      invitedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      acceptedAt: null,
    };
    this.teamInvites.set(id, invite);
    return invite;
  }

  getTeamInvitesByEmail(email: string): TeamInvite[] {
    return Array.from(this.teamInvites.values()).filter(
      i => i.email === email && i.acceptedAt === null && new Date(i.expiresAt) > new Date()
    );
  }

  getTeamInvite(inviteId: string): TeamInvite | undefined {
    return this.teamInvites.get(inviteId);
  }

  getTeamInvitesByTeam(teamId: string): TeamInvite[] {
    return Array.from(this.teamInvites.values()).filter(i => i.teamId === teamId);
  }

  acceptInvite(inviteId: string): TeamInvite | undefined {
    const invite = this.teamInvites.get(inviteId);
    if (!invite) return undefined;
    invite.acceptedAt = new Date().toISOString();
    return invite;
  }

  declineInvite(inviteId: string): boolean {
    return this.teamInvites.delete(inviteId);
  }

  // ---- Admin Methods ----
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
