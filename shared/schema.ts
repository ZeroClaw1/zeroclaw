import { z } from "zod";

// ---- Shared Types (used across multiple entities) ----
export type SubscriptionTier = "free" | "pro" | "team" | "enterprise";
export type UserRole = "user" | "admin";

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
  steps: {
    accountCreated: boolean;
    openclawConnected: boolean;
    firstAgentCreated: boolean;
    firstPipelineRun: boolean;
    firstWorkflow: boolean;
  };
}

// ---- User ----
export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  tier: SubscriptionTier;
  suspended: boolean;
  suspendedAt: string | null;
  onboarding: OnboardingState;
  teamId: string | null;
  createdAt: string;
}

export const registerSchema = z.object({
  email: z.string().email("Valid email required"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---- Status Types ----
export type WorkflowStatus = "running" | "success" | "failed" | "pending" | "cancelled";
export type AgentStatus = "online" | "offline" | "busy" | "error";
export type StepType = "build" | "test" | "deploy" | "lint" | "scan" | "notify" | "openclaw";

// ---- Pipeline ----
export interface PipelineStep {
  id: string;
  name: string;
  type: StepType;
  status: WorkflowStatus;
  duration: number;
  logs?: string[];
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  branch: string;
  commit: string;
  author: string;
  duration: number;
  startedAt: string;
  steps: PipelineStep[];
  envVars?: Record<string, string>;
}

export const insertPipelineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  branch: z.string().min(1, "Branch is required"),
  commit: z.string().default(""),
  author: z.string().default("user"),
  steps: z.array(z.object({
    name: z.string(),
    type: z.enum(["build", "test", "deploy", "lint", "scan", "notify", "openclaw"]),
  })).default([]),
  envVars: z.record(z.string()).optional().default({}),
});
export type InsertPipeline = z.infer<typeof insertPipelineSchema>;

// ---- Pipeline Templates ----
export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: Array<{ name: string; type: StepType }>;
  envVars: Record<string, string>;
  branch: string;
}

// ---- Agent ----
export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  model: string;
  gatewayUrl: string;
  skills: string[];
  lastHeartbeat: string;
  tasksCompleted: number;
  uptime: number;
  memoryUsage: number;
}

export const insertAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  model: z.string().min(1, "Model is required"),
  gatewayUrl: z.string().url("Must be a valid URL"),
  skills: z.array(z.string()).default([]),
});
export type InsertAgent = z.infer<typeof insertAgentSchema>;

// ---- Workflow ----
export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  lastRun: string;
  status: WorkflowStatus;
  totalRuns: number;
  successRate: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const insertWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  trigger: z.string().min(1, "Trigger is required"),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.record(z.unknown()).default({}),
  })).default([]),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    animated: z.boolean().optional(),
  })).default([]),
});
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;

// ---- Deployment ----
export interface Deployment {
  id: string;
  pipelineId: string;
  pipelineName: string;
  environment: "production" | "staging" | "development";
  status: WorkflowStatus;
  version: string;
  deployedAt: string;
  deployedBy: string;
  duration: number;
  url?: string;
  rollbackFromId?: string;
  isRollback?: boolean;
}

export const insertDeploymentSchema = z.object({
  pipelineId: z.string().min(1),
  environment: z.enum(["production", "staging", "development"]),
  version: z.string().min(1, "Version is required"),
  deployedBy: z.string().default("user"),
  url: z.string().optional(),
});
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;

// ---- OpenClaw Config ----
export interface OpenClawConfig {
  gatewayUrl: string;
  gatewayPort: number;
  model: string;
  fallbackModels: string[];
  heartbeatInterval: number;
  skills: string[];
  connected: boolean;
  autoReconnect: boolean;
  securityTools: {
    secureClaw: boolean;
    clawBands: boolean;
    aquaman: boolean;
  };
}

export const updateOpenClawConfigSchema = z.object({
  gatewayUrl: z.string().optional(),
  gatewayPort: z.number().optional(),
  model: z.string().optional(),
  fallbackModels: z.array(z.string()).optional(),
  heartbeatInterval: z.number().optional(),
  autoReconnect: z.boolean().optional(),
  securityTools: z.object({
    secureClaw: z.boolean().optional(),
    clawBands: z.boolean().optional(),
    aquaman: z.boolean().optional(),
  }).optional(),
});
export type UpdateOpenClawConfig = z.infer<typeof updateOpenClawConfigSchema>;

// ---- Plan ----
export type PlanStatus = "draft" | "ready" | "in_progress" | "completed" | "archived";

export interface PlanPhase {
  id: string;
  title: string;
  tasks: string[];
  workflowId?: string;
  pipelineId?: string;
  pipelineStatus?: WorkflowStatus;
}

export interface Plan {
  id: string;
  title: string;
  description: string;
  markdown: string;
  status: PlanStatus;
  phases: PlanPhase[];
  template?: string;
  createdAt: string;
  updatedAt: string;
}

export const insertPlanSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  markdown: z.string().default(""),
  template: z.string().optional(),
});
export type InsertPlan = z.infer<typeof insertPlanSchema>;

export const updatePlanSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  markdown: z.string().optional(),
  status: z.enum(["draft", "ready", "in_progress", "completed", "archived"]).optional(),
  phases: z.array(z.object({
    id: z.string(),
    title: z.string(),
    tasks: z.array(z.string()),
    workflowId: z.string().optional(),
    pipelineId: z.string().optional(),
    pipelineStatus: z.enum(["running", "success", "failed", "pending", "cancelled"]).optional(),
  })).optional(),
});
export type UpdatePlan = z.infer<typeof updatePlanSchema>;

// ---- Plan Templates ----
export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  markdown: string;
}

// ---- Dashboard Stats ----
export interface DashboardStats {
  totalPipelines: number;
  activePipelines: number;
  successRate: number;
  avgBuildTime: number;
  totalDeployments: number;
  activeAgents: number;
  totalAgents: number;
  failedToday: number;
}

// ---- Activity Events ----
export interface ActivityEvent {
  id: string;
  type: "pipeline" | "deployment" | "agent" | "openclaw";
  message: string;
  timestamp: string;
  status: WorkflowStatus | AgentStatus;
}

// ---- Auth / API Keys ----
export interface ApiKey {
  id: string;
  name: string;
  key: string;       // The hashed key (display as last 4 chars)
  prefix: string;    // First 8 chars for display "oc_...xxxx"
  createdAt: string;
  lastUsed: string | null;
  scopes: string[];  // e.g. ["pipelines:read", "pipelines:write", "agents:read"]
}

export const insertApiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  scopes: z.array(z.string()).default(["*"]),
});
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// ---- Skill Marketplace ----
export interface SkillMarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: "integration" | "devops" | "security" | "monitoring" | "utility" | "knowledge" | "coding";
  version: string;
  author: string;
  downloads: number;
  rating: number;
  icon: string;
  installed: boolean;
}

// ---- Dashboard Settings ----
export interface DashboardSettings {
  dashboardName: string;
  defaultPipelineTimeout: number;
  autoRefreshInterval: number;
  theme: "dark" | "light" | "system";
  accentColor: "teal" | "purple" | "pink" | "amber" | "green";
  compactMode: boolean;
  pipelineNotifications: boolean;
  deploymentNotifications: boolean;
  agentStatusNotifications: boolean;
  soundEffects: boolean;
  gatewayUrl: string;
  gatewayPort: number;
  autoReconnect: boolean;
  heartbeatInterval: number;
  widgetLayout?: Array<{ id: string; visible: boolean; order: number }>;
}

export const updateDashboardSettingsSchema = z.object({
  dashboardName: z.string().optional(),
  defaultPipelineTimeout: z.number().optional(),
  autoRefreshInterval: z.number().optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  accentColor: z.enum(["teal", "purple", "pink", "amber", "green"]).optional(),
  compactMode: z.boolean().optional(),
  pipelineNotifications: z.boolean().optional(),
  deploymentNotifications: z.boolean().optional(),
  agentStatusNotifications: z.boolean().optional(),
  soundEffects: z.boolean().optional(),
  gatewayUrl: z.string().optional(),
  gatewayPort: z.number().optional(),
  autoReconnect: z.boolean().optional(),
  heartbeatInterval: z.number().optional(),
  widgetLayout: z.array(z.object({
    id: z.string(),
    visible: z.boolean(),
    order: z.number(),
  })).optional(),
});
export type UpdateDashboardSettings = z.infer<typeof updateDashboardSettingsSchema>;

// ---- Notifications ----
export interface Notification {
  id: string;
  type: "pipeline" | "workflow" | "agent" | "deployment" | "system";
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  link?: string;
}

// ---- GitHub Actions ----
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
  head_branch: string;
  head_sha: string;
}

// ---- Secrets Manager ----
export interface Secret {
  id: string;
  name: string;
  maskedValue: string;
  scope: "global" | "pipeline";
  pipelineIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const insertSecretSchema = z.object({
  name: z.string().min(1).regex(/^[A-Z_][A-Z0-9_]*$/, "Must be uppercase with underscores"),
  value: z.string().min(1, "Value is required"),
  scope: z.enum(["global", "pipeline"]).default("global"),
  pipelineIds: z.array(z.string()).default([]),
});
export type InsertSecret = z.infer<typeof insertSecretSchema>;

// ---- Webhook Triggers ----
export interface WebhookConfig {
  id: string;
  name: string;
  event: "push" | "pull_request" | "release" | "workflow_dispatch";
  branch: string;
  workflowId: string;
  enabled: boolean;
  lastTriggered: string | null;
  triggerCount: number;
  createdAt: string;
}

export const insertWebhookConfigSchema = z.object({
  name: z.string().min(1),
  event: z.enum(["push", "pull_request", "release", "workflow_dispatch"]),
  branch: z.string().default("main"),
  workflowId: z.string().min(1),
  enabled: z.boolean().default(true),
});
export type InsertWebhookConfig = z.infer<typeof insertWebhookConfigSchema>;

// ---- Pipeline Artifacts ----
export interface PipelineArtifact {
  id: string;
  pipelineId: string;
  stepId: string;
  name: string;
  type: "log" | "report" | "binary" | "url";
  content: string;
  size: number;
  createdAt: string;
}

// ---- Agent Task Queue ----
export type TaskStatus = "queued" | "running" | "completed" | "failed";

export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "critical";
  pipelineId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export const insertAgentTaskSchema = z.object({
  agentId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  pipelineId: z.string().optional(),
});
export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;

// ---- Subscription / Billing ----
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "trialing";

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: number; // monthly in cents
  yearlyPrice: number; // yearly in cents
  features: string[];
  limits: {
    pipelines: number; // -1 = unlimited
    agents: number;
    workflows: number;
    teamMembers: number;
    buildsPerMonth: number;
    logRetentionDays: number;
  };
  highlighted?: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    yearlyPrice: 0,
    features: [
      "3 pipelines",
      "1 agent",
      "5 workflows",
      "50 builds/month",
      "7-day log retention",
      "Community support",
    ],
    limits: { pipelines: 3, agents: 1, workflows: 5, teamMembers: 1, buildsPerMonth: 50, logRetentionDays: 7 },
  },
  {
    id: "pro",
    name: "Pro",
    price: 1900, // $19/mo
    yearlyPrice: 19000, // $190/yr (~$15.83/mo)
    features: [
      "Unlimited pipelines",
      "5 agents",
      "Unlimited workflows",
      "500 builds/month",
      "30-day log retention",
      "Priority support",
      "Custom OpenClaw gateway",
      "Marketplace access",
    ],
    limits: { pipelines: -1, agents: 5, workflows: -1, teamMembers: 1, buildsPerMonth: 500, logRetentionDays: 30 },
    highlighted: true,
  },
  {
    id: "team",
    name: "Team",
    price: 4900, // $49/mo
    yearlyPrice: 49000, // $490/yr
    features: [
      "Everything in Pro",
      "10 agents",
      "Up to 10 team members",
      "2,000 builds/month",
      "90-day log retention",
      "Role-based access control",
      "Shared secrets & configs",
      "Audit log",
    ],
    limits: { pipelines: -1, agents: 10, workflows: -1, teamMembers: 10, buildsPerMonth: 2000, logRetentionDays: 90 },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: -1, // custom
    yearlyPrice: -1,
    features: [
      "Everything in Team",
      "Unlimited agents",
      "Unlimited team members",
      "Unlimited builds",
      "1-year log retention",
      "SSO / SAML",
      "Dedicated support",
      "Custom SLA",
      "On-premise option",
    ],
    limits: { pipelines: -1, agents: -1, workflows: -1, teamMembers: -1, buildsPerMonth: -1, logRetentionDays: 365 },
  },
];

// ---- Team / Organization ----
export type TeamRole = "owner" | "admin" | "member" | "viewer";

export interface Team {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  subscriptionId: string | null;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  invitedBy: string;
  joinedAt: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export const insertTeamSchema = z.object({
  name: z.string().min(2, "Team name is required").max(50),
});
export type InsertTeam = z.infer<typeof insertTeamSchema>;

export const inviteTeamMemberSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});
export type InviteTeamMember = z.infer<typeof inviteTeamMemberSchema>;

// ---- Audit Log ----
export interface AuditLogEntry {
  id: string;
  action: "create" | "update" | "delete" | "execute" | "rollback" | "install" | "configure";
  resource: "pipeline" | "agent" | "workflow" | "deployment" | "secret" | "webhook" | "setting" | "skill" | "plan";
  resourceId: string;
  resourceName: string;
  details: string;
  user: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ---- Obsidian Vault / Context Management ----
export interface ObsidianVaultConfig {
  id: string;
  vaultPath: string;
  syncMethod: "obsidian-sync" | "github" | "local" | "icloud";
  connected: boolean;
  lastSynced: string | null;
  totalNotes: number;
  totalLinks: number;
  includeFolders: string[];
  excludeFolders: string[];
  tokenBudget: number;
  retrievalStrategy: "zettelkasten" | "recent" | "relevant" | "manual";
}

export interface VaultNote {
  id: string;
  title: string;
  path: string;
  folder: string;
  tags: string[];
  links: string[];
  backlinks: string[];
  wordCount: number;
  lastModified: string;
  isStructureNote: boolean;
  trustState: "canonical" | "working" | "stale" | "contested";
}

export interface ContextSession {
  id: string;
  agentId: string;
  notesLoaded: number;
  tokensUsed: number;
  tokenBudget: number;
  retrievalHits: number;
  startedAt: string;
  status: "active" | "idle" | "expired";
}

// ---- Claude Code Integration ----
export type ClaudeCodeStatus = "connected" | "disconnected" | "error";
export type CodingTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ClaudeAuthMethod = "api_key" | "oauth_token";

export interface ClaudeCodeConfig {
  id: string;
  authMethod: ClaudeAuthMethod;
  apiKey: string;
  oauthToken: string;
  model: string;
  maxTokens: number;
  status: ClaudeCodeStatus;
  lastUsed: string | null;
  totalTasks: number;
  totalTokensUsed: number;
  useObsidianContext: boolean;
  allowedTools: string[];
  systemPrompt: string;
}

export interface CodingTask {
  id: string;
  title: string;
  prompt: string;
  status: CodingTaskStatus;
  model: string;
  response: string | null;
  tokensUsed: number;
  contextNotes: string[];
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

export const updateClaudeCodeConfigSchema = z.object({
  authMethod: z.enum(["api_key", "oauth_token"]).optional(),
  apiKey: z.string().optional(),
  oauthToken: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().min(256).max(128000).optional(),
  useObsidianContext: z.boolean().optional(),
  allowedTools: z.array(z.string()).optional(),
  systemPrompt: z.string().optional(),
});
export type UpdateClaudeCodeConfig = z.infer<typeof updateClaudeCodeConfigSchema>;

export const submitCodingTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  prompt: z.string().min(1, "Prompt is required"),
  contextNoteIds: z.array(z.string()).optional(),
});
export type SubmitCodingTask = z.infer<typeof submitCodingTaskSchema>;

export const updateVaultConfigSchema = z.object({
  vaultPath: z.string().optional(),
  syncMethod: z.enum(["obsidian-sync", "github", "local", "icloud"]).optional(),
  includeFolders: z.array(z.string()).optional(),
  excludeFolders: z.array(z.string()).optional(),
  tokenBudget: z.number().min(1000).max(200000).optional(),
  retrievalStrategy: z.enum(["zettelkasten", "recent", "relevant", "manual"]).optional(),
});
export type UpdateVaultConfig = z.infer<typeof updateVaultConfigSchema>;

// ---- Context Orchestration System ----
export type SubAgentStatus = "spawning" | "running" | "completed" | "failed" | "cancelled";
export type ContextHealthStatus = "healthy" | "warning" | "critical" | "overflow";
export type MemoryType = "fact" | "preference" | "project" | "conversation";
export type HandoffType = "delegation" | "result" | "file_share" | "context_summary";

// Tracks each agent's context window usage
export interface ContextWindow {
  id: string;
  agentId: string;
  agentName: string;
  maxTokens: number;
  usedTokens: number;
  reservedTokens: number; // tokens reserved for system prompt + tools
  healthStatus: ContextHealthStatus;
  compressionEnabled: boolean;
  autoSummarizeThreshold: number; // percentage (0-100) at which auto-summarize triggers
  lastCompressedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// SubAgent spawned by a parent agent
export interface SubAgent {
  id: string;
  parentAgentId: string;
  agentName: string;
  objective: string;
  status: SubAgentStatus;
  model: string;
  inputTokens: number;
  outputTokens: number;
  workspaceFiles: string[]; // file paths this subagent has written
  result: string | null; // summary returned to parent
  error: string | null;
  spawnedAt: string;
  completedAt: string | null;
  duration: number; // seconds
}

// Files in the shared workspace between agents
export interface SharedWorkspaceFile {
  id: string;
  path: string;
  name: string;
  type: "data" | "config" | "result" | "intermediate" | "log";
  size: number; // bytes
  createdBy: string; // agent id
  lastAccessedBy: string; // agent id
  accessCount: number;
  createdAt: string;
  updatedAt: string;
}

// Persistent memory entries for agents
export interface AgentMemoryEntry {
  id: string;
  agentId: string;
  memoryType: MemoryType;
  content: string;
  source: string; // which conversation/task it came from
  confidence: number; // 0-1
  accessCount: number;
  lastAccessed: string;
  createdAt: string;
  expiresAt: string | null;
}

// Handoff events between agents (parent <-> subagent communication)
export interface ContextHandoff {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  handoffType: HandoffType;
  tokensBefore: number;
  tokensAfter: number;
  tokensSaved: number;
  payload: string; // summary or file reference
  success: boolean;
  timestamp: string;
}

// Orchestration stats for the overview
export interface OrchestrationStats {
  totalSubAgentsSpawned: number;
  activeSubAgents: number;
  completedSubAgents: number;
  failedSubAgents: number;
  totalTokensUsed: number;
  totalTokensSaved: number;
  avgContextUtilization: number; // percentage
  totalHandoffs: number;
  totalWorkspaceFiles: number;
  totalMemoryEntries: number;
}

export const spawnSubAgentSchema = z.object({
  parentAgentId: z.string().min(1),
  agentName: z.string().min(1),
  objective: z.string().min(1),
  model: z.string().default("claude-sonnet-4-6"),
});
export type SpawnSubAgent = z.infer<typeof spawnSubAgentSchema>;

export const createWorkspaceFileSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["data", "config", "result", "intermediate", "log"]),
  size: z.number().default(0),
  createdBy: z.string().min(1),
});
export type CreateWorkspaceFile = z.infer<typeof createWorkspaceFileSchema>;

export const createMemoryEntrySchema = z.object({
  agentId: z.string().min(1),
  memoryType: z.enum(["fact", "preference", "project", "conversation"]),
  content: z.string().min(1),
  source: z.string().default("manual"),
  confidence: z.number().min(0).max(1).default(0.8),
});
export type CreateMemoryEntry = z.infer<typeof createMemoryEntrySchema>;

export const updateContextWindowSchema = z.object({
  maxTokens: z.number().min(1000).optional(),
  compressionEnabled: z.boolean().optional(),
  autoSummarizeThreshold: z.number().min(50).max(100).optional(),
});
export type UpdateContextWindow = z.infer<typeof updateContextWindowSchema>;
