import pg from "pg";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set — database features disabled");
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

/** Run on startup to ensure required tables exist */
export async function ensureTables() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      tier TEXT NOT NULL DEFAULT 'free',
      suspended BOOLEAN NOT NULL DEFAULT false,
      suspended_at TEXT,
      onboarding JSONB NOT NULL DEFAULT '{"completed":false,"currentStep":0,"steps":{"accountCreated":true,"openclawConnected":false,"firstAgentCreated":false,"firstPipelineRun":false,"firstWorkflow":false}}',
      team_id TEXT,
      created_at TEXT NOT NULL
    );

    -- Session table for connect-pg-simple
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

    -- Drop and recreate password_reset_tokens if schema changed
    DROP TABLE IF EXISTS password_reset_tokens;
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );

    -- Claude Code configs (one per user)
    CREATE TABLE IF NOT EXISTS claude_code_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      auth_method TEXT NOT NULL DEFAULT 'api_key',
      api_key TEXT NOT NULL DEFAULT '',
      oauth_token TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
      max_tokens INTEGER NOT NULL DEFAULT 8192,
      status TEXT NOT NULL DEFAULT 'disconnected',
      last_used TEXT,
      total_tasks INTEGER NOT NULL DEFAULT 0,
      total_tokens_used INTEGER NOT NULL DEFAULT 0,
      use_obsidian_context BOOLEAN NOT NULL DEFAULT false,
      allowed_tools JSONB NOT NULL DEFAULT '[]',
      system_prompt TEXT NOT NULL DEFAULT ''
    );

    -- Coding tasks (many per user)
    CREATE TABLE IF NOT EXISTS coding_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
      response TEXT,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      context_notes JSONB NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      error TEXT
    );

    -- Vault configs (one per user)
    CREATE TABLE IF NOT EXISTS vault_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vault_path TEXT NOT NULL DEFAULT '',
      sync_method TEXT NOT NULL DEFAULT 'local',
      connected BOOLEAN NOT NULL DEFAULT false,
      last_synced TEXT,
      total_notes INTEGER NOT NULL DEFAULT 0,
      total_links INTEGER NOT NULL DEFAULT 0,
      include_folders JSONB NOT NULL DEFAULT '[]',
      exclude_folders JSONB NOT NULL DEFAULT '[]',
      token_budget INTEGER NOT NULL DEFAULT 32000,
      retrieval_strategy TEXT NOT NULL DEFAULT 'zettelkasten'
    );

    -- Vault notes (many per user)
    CREATE TABLE IF NOT EXISTS vault_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      path TEXT NOT NULL,
      folder TEXT NOT NULL DEFAULT '',
      tags JSONB NOT NULL DEFAULT '[]',
      links JSONB NOT NULL DEFAULT '[]',
      backlinks JSONB NOT NULL DEFAULT '[]',
      word_count INTEGER NOT NULL DEFAULT 0,
      last_modified TEXT NOT NULL,
      is_structure_note BOOLEAN NOT NULL DEFAULT false,
      trust_state TEXT NOT NULL DEFAULT 'working'
    );

    -- Context sessions (many per user)
    CREATE TABLE IF NOT EXISTS context_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL,
      notes_loaded INTEGER NOT NULL DEFAULT 0,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      token_budget INTEGER NOT NULL DEFAULT 32000,
      retrieval_hits INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'idle'
    );

    -- Pipelines (many per user)
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      branch TEXT NOT NULL DEFAULT 'main',
      commit TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT 'user',
      duration INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      steps JSONB NOT NULL DEFAULT '[]',
      env_vars JSONB NOT NULL DEFAULT '{}'
    );

    -- Agents (many per user)
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'offline',
      model TEXT NOT NULL,
      gateway_url TEXT NOT NULL,
      skills JSONB NOT NULL DEFAULT '[]',
      last_heartbeat TEXT NOT NULL,
      tasks_completed INTEGER NOT NULL DEFAULT 0,
      uptime NUMERIC NOT NULL DEFAULT 0,
      memory_usage NUMERIC NOT NULL DEFAULT 0
    );

    -- Workflows (many per user)
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      trigger TEXT NOT NULL,
      last_run TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      total_runs INTEGER NOT NULL DEFAULT 0,
      success_rate NUMERIC NOT NULL DEFAULT 0,
      nodes JSONB NOT NULL DEFAULT '[]',
      edges JSONB NOT NULL DEFAULT '[]'
    );

    -- Deployments (many per user)
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pipeline_id TEXT NOT NULL,
      pipeline_name TEXT NOT NULL,
      environment TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      version TEXT NOT NULL,
      deployed_at TEXT NOT NULL,
      deployed_by TEXT NOT NULL DEFAULT 'user',
      duration INTEGER NOT NULL DEFAULT 0,
      url TEXT,
      rollback_from_id TEXT,
      is_rollback BOOLEAN NOT NULL DEFAULT false
    );

    -- Plans (many per user)
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      markdown TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      phases JSONB NOT NULL DEFAULT '[]',
      template TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Dashboard settings (one per user)
    CREATE TABLE IF NOT EXISTS dashboard_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings JSONB NOT NULL DEFAULT '{}'
    );

    -- Secrets (many per user)
    CREATE TABLE IF NOT EXISTS secrets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      masked_value TEXT NOT NULL,
      raw_value TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'global',
      pipeline_ids JSONB NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Webhooks (many per user)
    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      event TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT 'main',
      workflow_id TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      last_triggered TEXT,
      trigger_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Notifications (many per user)
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT false,
      timestamp TEXT NOT NULL,
      link TEXT
    );

    -- Audit log (many per user)
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      resource_name TEXT NOT NULL,
      details TEXT NOT NULL,
      "user" TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      metadata JSONB
    );

    -- API keys (many per user)
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key TEXT NOT NULL,
      prefix TEXT NOT NULL,
      raw_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used TEXT,
      scopes JSONB NOT NULL DEFAULT '["*"]'
    );

    -- Auth enabled per user
    CREATE TABLE IF NOT EXISTS auth_enabled (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      enabled BOOLEAN NOT NULL DEFAULT false
    );

    -- Agent tasks (many per user)
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'queued',
      priority TEXT NOT NULL DEFAULT 'medium',
      pipeline_id TEXT,
      created_at TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT
    );

    -- Activity events (many per user)
    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      status TEXT NOT NULL
    );

    -- OpenClaw configs (one per user)
    CREATE TABLE IF NOT EXISTS openclaw_configs (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      config JSONB NOT NULL DEFAULT '{}'
    );
  `);

  console.log("[db] Tables ensured");
}

/** Load all users from the database */
export async function loadUsersFromDb(): Promise<Array<{
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: string;
  tier: string;
  suspended: boolean;
  suspendedAt: string | null;
  onboarding: any;
  teamId: string | null;
  createdAt: string;
}>> {
  if (!pool) return [];

  const result = await pool.query(
    `SELECT id, email, username, password_hash, role, tier, suspended, suspended_at, onboarding, team_id, created_at FROM users`
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    tier: row.tier,
    suspended: row.suspended,
    suspendedAt: row.suspended_at,
    onboarding: row.onboarding,
    teamId: row.team_id,
    createdAt: row.created_at,
  }));
}

/** Persist a user to the database (upsert) */
export async function persistUser(user: {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: string;
  tier: string;
  suspended: boolean;
  suspendedAt: string | null;
  onboarding: any;
  teamId: string | null;
  createdAt: string;
}) {
  if (!pool) return;

  await pool.query(
    `INSERT INTO users (id, email, username, password_hash, role, tier, suspended, suspended_at, onboarding, team_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       username = EXCLUDED.username,
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       tier = EXCLUDED.tier,
       suspended = EXCLUDED.suspended,
       suspended_at = EXCLUDED.suspended_at,
       onboarding = EXCLUDED.onboarding,
       team_id = EXCLUDED.team_id`,
    [
      user.id,
      user.email,
      user.username,
      user.passwordHash,
      user.role,
      user.tier,
      user.suspended,
      user.suspendedAt,
      JSON.stringify(user.onboarding),
      user.teamId,
      user.createdAt,
    ]
  );
}

/** Save a password reset token */
export async function saveResetToken(id: string, userId: string, tokenHash: string, expiresAt: string) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4::timestamptz)`,
    [id, userId, tokenHash, expiresAt]
  );
}

/** Validate a password reset token — returns userId if valid */
export async function validateResetToken(tokenHash: string): Promise<string | null> {
  if (!pool) return null;
  const result = await pool.query(
    `SELECT user_id FROM password_reset_tokens 
     WHERE token_hash = $1 AND expires_at > NOW() AND used_at IS NULL`,
    [tokenHash]
  );
  return result.rows.length > 0 ? result.rows[0].user_id : null;
}

/** Mark a reset token as used */
export async function markResetTokenUsed(tokenHash: string) {
  if (!pool) return;
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1`,
    [tokenHash]
  );
}

// ---- Claude Code Config ----

export async function dbGetClaudeCodeConfig(userId: string): Promise<any | null> {
  if (!pool) return null;
  const result = await pool.query(
    `SELECT * FROM claude_code_configs WHERE user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    authMethod: row.auth_method,
    apiKey: row.api_key,
    oauthToken: row.oauth_token,
    model: row.model,
    maxTokens: row.max_tokens,
    status: row.status,
    lastUsed: row.last_used,
    totalTasks: row.total_tasks,
    totalTokensUsed: row.total_tokens_used,
    useObsidianContext: row.use_obsidian_context,
    allowedTools: row.allowed_tools,
    systemPrompt: row.system_prompt,
  };
}

export async function dbUpsertClaudeCodeConfig(userId: string, config: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO claude_code_configs
       (id, user_id, auth_method, api_key, oauth_token, model, max_tokens, status, last_used, total_tasks, total_tokens_used, use_obsidian_context, allowed_tools, system_prompt)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (id) DO UPDATE SET
       auth_method = EXCLUDED.auth_method,
       api_key = EXCLUDED.api_key,
       oauth_token = EXCLUDED.oauth_token,
       model = EXCLUDED.model,
       max_tokens = EXCLUDED.max_tokens,
       status = EXCLUDED.status,
       last_used = EXCLUDED.last_used,
       total_tasks = EXCLUDED.total_tasks,
       total_tokens_used = EXCLUDED.total_tokens_used,
       use_obsidian_context = EXCLUDED.use_obsidian_context,
       allowed_tools = EXCLUDED.allowed_tools,
       system_prompt = EXCLUDED.system_prompt`,
    [
      config.id,
      userId,
      config.authMethod,
      config.apiKey,
      config.oauthToken,
      config.model,
      config.maxTokens,
      config.status,
      config.lastUsed,
      config.totalTasks,
      config.totalTokensUsed,
      config.useObsidianContext,
      JSON.stringify(config.allowedTools),
      config.systemPrompt,
    ]
  );
}

// ---- Coding Tasks ----

export async function dbGetCodingTasks(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM coding_tasks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    status: row.status,
    model: row.model,
    response: row.response,
    tokensUsed: row.tokens_used,
    contextNotes: row.context_notes,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    error: row.error,
  }));
}

export async function dbUpsertCodingTask(userId: string, task: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO coding_tasks
       (id, user_id, title, prompt, status, model, response, tokens_used, context_notes, created_at, completed_at, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       prompt = EXCLUDED.prompt,
       status = EXCLUDED.status,
       model = EXCLUDED.model,
       response = EXCLUDED.response,
       tokens_used = EXCLUDED.tokens_used,
       context_notes = EXCLUDED.context_notes,
       completed_at = EXCLUDED.completed_at,
       error = EXCLUDED.error`,
    [
      task.id,
      userId,
      task.title,
      task.prompt,
      task.status,
      task.model,
      task.response,
      task.tokensUsed,
      JSON.stringify(task.contextNotes),
      task.createdAt,
      task.completedAt,
      task.error,
    ]
  );
}

export async function dbDeleteCodingTask(userId: string, taskId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM coding_tasks WHERE id = $1 AND user_id = $2`, [taskId, userId]);
}

// ---- Vault Config ----

export async function dbGetVaultConfig(userId: string): Promise<any | null> {
  if (!pool) return null;
  const result = await pool.query(
    `SELECT * FROM vault_configs WHERE user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    vaultPath: row.vault_path,
    syncMethod: row.sync_method,
    connected: row.connected,
    lastSynced: row.last_synced,
    totalNotes: row.total_notes,
    totalLinks: row.total_links,
    includeFolders: row.include_folders,
    excludeFolders: row.exclude_folders,
    tokenBudget: row.token_budget,
    retrievalStrategy: row.retrieval_strategy,
  };
}

export async function dbUpsertVaultConfig(userId: string, config: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO vault_configs
       (id, user_id, vault_path, sync_method, connected, last_synced, total_notes, total_links, include_folders, exclude_folders, token_budget, retrieval_strategy)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
       vault_path = EXCLUDED.vault_path,
       sync_method = EXCLUDED.sync_method,
       connected = EXCLUDED.connected,
       last_synced = EXCLUDED.last_synced,
       total_notes = EXCLUDED.total_notes,
       total_links = EXCLUDED.total_links,
       include_folders = EXCLUDED.include_folders,
       exclude_folders = EXCLUDED.exclude_folders,
       token_budget = EXCLUDED.token_budget,
       retrieval_strategy = EXCLUDED.retrieval_strategy`,
    [
      config.id,
      userId,
      config.vaultPath,
      config.syncMethod,
      config.connected,
      config.lastSynced,
      config.totalNotes,
      config.totalLinks,
      JSON.stringify(config.includeFolders),
      JSON.stringify(config.excludeFolders),
      config.tokenBudget,
      config.retrievalStrategy,
    ]
  );
}

export async function dbDeleteVaultConfig(userId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM vault_configs WHERE user_id = $1`, [userId]);
}

// ---- Vault Notes ----

export async function dbGetVaultNotes(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM vault_notes WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    path: row.path,
    folder: row.folder,
    tags: row.tags,
    links: row.links,
    backlinks: row.backlinks,
    wordCount: row.word_count,
    lastModified: row.last_modified,
    isStructureNote: row.is_structure_note,
    trustState: row.trust_state,
  }));
}

export async function dbUpsertVaultNote(userId: string, note: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO vault_notes
       (id, user_id, title, path, folder, tags, links, backlinks, word_count, last_modified, is_structure_note, trust_state)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       path = EXCLUDED.path,
       folder = EXCLUDED.folder,
       tags = EXCLUDED.tags,
       links = EXCLUDED.links,
       backlinks = EXCLUDED.backlinks,
       word_count = EXCLUDED.word_count,
       last_modified = EXCLUDED.last_modified,
       is_structure_note = EXCLUDED.is_structure_note,
       trust_state = EXCLUDED.trust_state`,
    [
      note.id,
      userId,
      note.title,
      note.path,
      note.folder,
      JSON.stringify(note.tags),
      JSON.stringify(note.links),
      JSON.stringify(note.backlinks),
      note.wordCount,
      note.lastModified,
      note.isStructureNote,
      note.trustState,
    ]
  );
}

export async function dbDeleteVaultNotesByUser(userId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM vault_notes WHERE user_id = $1`, [userId]);
}

// ---- Context Sessions ----

export async function dbGetContextSessions(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM context_sessions WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    agentId: row.agent_id,
    notesLoaded: row.notes_loaded,
    tokensUsed: row.tokens_used,
    tokenBudget: row.token_budget,
    retrievalHits: row.retrieval_hits,
    startedAt: row.started_at,
    status: row.status,
  }));
}

export async function dbUpsertContextSession(userId: string, session: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO context_sessions
       (id, user_id, agent_id, notes_loaded, tokens_used, token_budget, retrieval_hits, started_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       agent_id = EXCLUDED.agent_id,
       notes_loaded = EXCLUDED.notes_loaded,
       tokens_used = EXCLUDED.tokens_used,
       token_budget = EXCLUDED.token_budget,
       retrieval_hits = EXCLUDED.retrieval_hits,
       started_at = EXCLUDED.started_at,
       status = EXCLUDED.status`,
    [
      session.id,
      userId,
      session.agentId,
      session.notesLoaded,
      session.tokensUsed,
      session.tokenBudget,
      session.retrievalHits,
      session.startedAt,
      session.status,
    ]
  );
}

export async function dbDeleteContextSessionsByUser(userId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM context_sessions WHERE user_id = $1`, [userId]);
}

// ---- Pipelines ----

export async function dbGetPipelines(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM pipelines WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    branch: row.branch,
    commit: row.commit,
    author: row.author,
    duration: row.duration,
    startedAt: row.started_at,
    steps: row.steps,
    envVars: row.env_vars,
  }));
}

export async function dbUpsertPipeline(userId: string, pipeline: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO pipelines
       (id, user_id, name, description, status, branch, commit, author, duration, started_at, steps, env_vars)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       status = EXCLUDED.status,
       branch = EXCLUDED.branch,
       commit = EXCLUDED.commit,
       author = EXCLUDED.author,
       duration = EXCLUDED.duration,
       started_at = EXCLUDED.started_at,
       steps = EXCLUDED.steps,
       env_vars = EXCLUDED.env_vars`,
    [
      pipeline.id,
      userId,
      pipeline.name,
      pipeline.description,
      pipeline.status,
      pipeline.branch,
      pipeline.commit,
      pipeline.author,
      pipeline.duration,
      pipeline.startedAt,
      JSON.stringify(pipeline.steps),
      JSON.stringify(pipeline.envVars || {}),
    ]
  );
}

export async function dbDeletePipeline(userId: string, pipelineId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM pipelines WHERE id = $1 AND user_id = $2`, [pipelineId, userId]);
}

// ---- Agents ----

export async function dbGetAgents(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM agents WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    model: row.model,
    gatewayUrl: row.gateway_url,
    skills: row.skills,
    lastHeartbeat: row.last_heartbeat,
    tasksCompleted: row.tasks_completed,
    uptime: Number(row.uptime),
    memoryUsage: Number(row.memory_usage),
  }));
}

export async function dbUpsertAgent(userId: string, agent: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO agents
       (id, user_id, name, status, model, gateway_url, skills, last_heartbeat, tasks_completed, uptime, memory_usage)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       status = EXCLUDED.status,
       model = EXCLUDED.model,
       gateway_url = EXCLUDED.gateway_url,
       skills = EXCLUDED.skills,
       last_heartbeat = EXCLUDED.last_heartbeat,
       tasks_completed = EXCLUDED.tasks_completed,
       uptime = EXCLUDED.uptime,
       memory_usage = EXCLUDED.memory_usage`,
    [
      agent.id,
      userId,
      agent.name,
      agent.status,
      agent.model,
      agent.gatewayUrl,
      JSON.stringify(agent.skills),
      agent.lastHeartbeat,
      agent.tasksCompleted,
      agent.uptime,
      agent.memoryUsage,
    ]
  );
}

export async function dbDeleteAgent(userId: string, agentId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM agents WHERE id = $1 AND user_id = $2`, [agentId, userId]);
}

// ---- Workflows ----

export async function dbGetWorkflows(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM workflows WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    trigger: row.trigger,
    lastRun: row.last_run,
    status: row.status,
    totalRuns: row.total_runs,
    successRate: Number(row.success_rate),
    nodes: row.nodes,
    edges: row.edges,
  }));
}

export async function dbUpsertWorkflow(userId: string, workflow: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO workflows
       (id, user_id, name, description, trigger, last_run, status, total_runs, success_rate, nodes, edges)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       trigger = EXCLUDED.trigger,
       last_run = EXCLUDED.last_run,
       status = EXCLUDED.status,
       total_runs = EXCLUDED.total_runs,
       success_rate = EXCLUDED.success_rate,
       nodes = EXCLUDED.nodes,
       edges = EXCLUDED.edges`,
    [
      workflow.id,
      userId,
      workflow.name,
      workflow.description,
      workflow.trigger,
      workflow.lastRun,
      workflow.status,
      workflow.totalRuns,
      workflow.successRate,
      JSON.stringify(workflow.nodes),
      JSON.stringify(workflow.edges),
    ]
  );
}

export async function dbDeleteWorkflow(userId: string, workflowId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM workflows WHERE id = $1 AND user_id = $2`, [workflowId, userId]);
}

// ---- Deployments ----

export async function dbGetDeployments(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM deployments WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    pipelineId: row.pipeline_id,
    pipelineName: row.pipeline_name,
    environment: row.environment,
    status: row.status,
    version: row.version,
    deployedAt: row.deployed_at,
    deployedBy: row.deployed_by,
    duration: row.duration,
    url: row.url,
    rollbackFromId: row.rollback_from_id,
    isRollback: row.is_rollback,
  }));
}

export async function dbUpsertDeployment(userId: string, deployment: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO deployments
       (id, user_id, pipeline_id, pipeline_name, environment, status, version, deployed_at, deployed_by, duration, url, rollback_from_id, is_rollback)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (id) DO UPDATE SET
       pipeline_id = EXCLUDED.pipeline_id,
       pipeline_name = EXCLUDED.pipeline_name,
       environment = EXCLUDED.environment,
       status = EXCLUDED.status,
       version = EXCLUDED.version,
       deployed_at = EXCLUDED.deployed_at,
       deployed_by = EXCLUDED.deployed_by,
       duration = EXCLUDED.duration,
       url = EXCLUDED.url,
       rollback_from_id = EXCLUDED.rollback_from_id,
       is_rollback = EXCLUDED.is_rollback`,
    [
      deployment.id,
      userId,
      deployment.pipelineId,
      deployment.pipelineName,
      deployment.environment,
      deployment.status,
      deployment.version,
      deployment.deployedAt,
      deployment.deployedBy,
      deployment.duration,
      deployment.url || null,
      deployment.rollbackFromId || null,
      deployment.isRollback || false,
    ]
  );
}

// ---- Plans ----

export async function dbGetPlans(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM plans WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    markdown: row.markdown,
    status: row.status,
    phases: row.phases,
    template: row.template,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function dbUpsertPlan(userId: string, plan: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO plans
       (id, user_id, title, description, markdown, status, phases, template, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       markdown = EXCLUDED.markdown,
       status = EXCLUDED.status,
       phases = EXCLUDED.phases,
       template = EXCLUDED.template,
       updated_at = EXCLUDED.updated_at`,
    [
      plan.id,
      userId,
      plan.title,
      plan.description,
      plan.markdown,
      plan.status,
      JSON.stringify(plan.phases),
      plan.template || null,
      plan.createdAt,
      plan.updatedAt,
    ]
  );
}

export async function dbDeletePlan(userId: string, planId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM plans WHERE id = $1 AND user_id = $2`, [planId, userId]);
}

// ---- Dashboard Settings ----

export async function dbGetDashboardSettings(userId: string): Promise<any | null> {
  if (!pool) return null;
  const result = await pool.query(
    `SELECT settings FROM dashboard_settings WHERE user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].settings;
}

export async function dbUpsertDashboardSettings(userId: string, settings: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO dashboard_settings (user_id, settings)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET settings = EXCLUDED.settings`,
    [userId, JSON.stringify(settings)]
  );
}

// ---- Secrets ----

export async function dbGetSecrets(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM secrets WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    maskedValue: row.masked_value,
    rawValue: row.raw_value,
    scope: row.scope,
    pipelineIds: row.pipeline_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function dbUpsertSecret(userId: string, secret: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO secrets
       (id, user_id, name, masked_value, raw_value, scope, pipeline_ids, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       masked_value = EXCLUDED.masked_value,
       raw_value = EXCLUDED.raw_value,
       scope = EXCLUDED.scope,
       pipeline_ids = EXCLUDED.pipeline_ids,
       updated_at = EXCLUDED.updated_at`,
    [
      secret.id,
      userId,
      secret.name,
      secret.maskedValue,
      secret.rawValue,
      secret.scope,
      JSON.stringify(secret.pipelineIds),
      secret.createdAt,
      secret.updatedAt,
    ]
  );
}

export async function dbDeleteSecret(userId: string, secretId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM secrets WHERE id = $1 AND user_id = $2`, [secretId, userId]);
}

// ---- Webhooks ----

export async function dbGetWebhooks(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM webhooks WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    event: row.event,
    branch: row.branch,
    workflowId: row.workflow_id,
    enabled: row.enabled,
    lastTriggered: row.last_triggered,
    triggerCount: row.trigger_count,
    createdAt: row.created_at,
  }));
}

export async function dbUpsertWebhook(userId: string, webhook: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO webhooks
       (id, user_id, name, event, branch, workflow_id, enabled, last_triggered, trigger_count, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       event = EXCLUDED.event,
       branch = EXCLUDED.branch,
       workflow_id = EXCLUDED.workflow_id,
       enabled = EXCLUDED.enabled,
       last_triggered = EXCLUDED.last_triggered,
       trigger_count = EXCLUDED.trigger_count`,
    [
      webhook.id,
      userId,
      webhook.name,
      webhook.event,
      webhook.branch,
      webhook.workflowId,
      webhook.enabled,
      webhook.lastTriggered,
      webhook.triggerCount,
      webhook.createdAt,
    ]
  );
}

export async function dbDeleteWebhook(userId: string, webhookId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM webhooks WHERE id = $1 AND user_id = $2`, [webhookId, userId]);
}

// ---- Notifications ----

export async function dbGetNotifications(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY timestamp DESC`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    timestamp: row.timestamp,
    link: row.link,
  }));
}

export async function dbUpsertNotification(userId: string, notification: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO notifications
       (id, user_id, type, title, message, read, timestamp, link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       type = EXCLUDED.type,
       title = EXCLUDED.title,
       message = EXCLUDED.message,
       read = EXCLUDED.read,
       timestamp = EXCLUDED.timestamp,
       link = EXCLUDED.link`,
    [
      notification.id,
      userId,
      notification.type,
      notification.title,
      notification.message,
      notification.read,
      notification.timestamp,
      notification.link || null,
    ]
  );
}

export async function dbMarkAllNotificationsRead(userId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`UPDATE notifications SET read = true WHERE user_id = $1`, [userId]);
}

export async function dbClearNotifications(userId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
}

// ---- Audit Log ----

export async function dbGetAuditLog(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM audit_log WHERE user_id = $1 ORDER BY timestamp DESC`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    resourceName: row.resource_name,
    details: row.details,
    user: row.user,
    timestamp: row.timestamp,
    metadata: row.metadata,
  }));
}

export async function dbInsertAuditLog(userId: string, entry: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO audit_log
       (id, user_id, action, resource, resource_id, resource_name, details, "user", timestamp, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO NOTHING`,
    [
      entry.id,
      userId,
      entry.action,
      entry.resource,
      entry.resourceId,
      entry.resourceName,
      entry.details,
      entry.user,
      entry.timestamp,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ]
  );
}

export async function dbClearAuditLog(userId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM audit_log WHERE user_id = $1`, [userId]);
}

// ---- API Keys ----

export async function dbGetApiKeys(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM api_keys WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    key: row.key,
    prefix: row.prefix,
    rawKey: row.raw_key,
    createdAt: row.created_at,
    lastUsed: row.last_used,
    scopes: row.scopes,
  }));
}

export async function dbUpsertApiKey(userId: string, apiKey: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO api_keys
       (id, user_id, name, key, prefix, raw_key, created_at, last_used, scopes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       key = EXCLUDED.key,
       prefix = EXCLUDED.prefix,
       raw_key = EXCLUDED.raw_key,
       last_used = EXCLUDED.last_used,
       scopes = EXCLUDED.scopes`,
    [
      apiKey.id,
      userId,
      apiKey.name,
      apiKey.key,
      apiKey.prefix,
      apiKey.rawKey,
      apiKey.createdAt,
      apiKey.lastUsed,
      JSON.stringify(apiKey.scopes),
    ]
  );
}

export async function dbDeleteApiKey(userId: string, keyId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM api_keys WHERE id = $1 AND user_id = $2`, [keyId, userId]);
}

// ---- Auth Enabled ----

export async function dbGetAuthEnabled(userId: string): Promise<boolean | null> {
  if (!pool) return null;
  const result = await pool.query(
    `SELECT enabled FROM auth_enabled WHERE user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].enabled;
}

export async function dbUpsertAuthEnabled(userId: string, enabled: boolean): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO auth_enabled (user_id, enabled) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET enabled = EXCLUDED.enabled`,
    [userId, enabled]
  );
}

// ---- Agent Tasks ----

export async function dbGetAgentTasks(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM agent_tasks WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    agentId: row.agent_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    pipelineId: row.pipeline_id,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }));
}

export async function dbUpsertAgentTask(userId: string, task: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO agent_tasks
       (id, user_id, agent_id, title, description, status, priority, pipeline_id, created_at, started_at, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       agent_id = EXCLUDED.agent_id,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       status = EXCLUDED.status,
       priority = EXCLUDED.priority,
       pipeline_id = EXCLUDED.pipeline_id,
       started_at = EXCLUDED.started_at,
       completed_at = EXCLUDED.completed_at`,
    [
      task.id,
      userId,
      task.agentId,
      task.title,
      task.description,
      task.status,
      task.priority,
      task.pipelineId || null,
      task.createdAt,
      task.startedAt || null,
      task.completedAt || null,
    ]
  );
}

export async function dbDeleteAgentTask(userId: string, taskId: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM agent_tasks WHERE id = $1 AND user_id = $2`, [taskId, userId]);
}

// ---- Activity Events ----

export async function dbGetActivityEvents(userId: string): Promise<any[]> {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT * FROM activity_events WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 200`,
    [userId]
  );
  return result.rows.map((row: any) => ({
    id: row.id,
    type: row.type,
    message: row.message,
    timestamp: row.timestamp,
    status: row.status,
  }));
}

export async function dbInsertActivityEvent(userId: string, event: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO activity_events (id, user_id, type, message, timestamp, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING`,
    [event.id, userId, event.type, event.message, event.timestamp, event.status]
  );
}

export async function dbTrimActivityEvents(userId: string): Promise<void> {
  if (!pool) return;
  // Keep the most recent 100 events
  await pool.query(
    `DELETE FROM activity_events WHERE user_id = $1 AND id NOT IN (
       SELECT id FROM activity_events WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 100
     )`,
    [userId]
  );
}

// ---- OpenClaw Configs ----

export async function dbGetOpenClawConfig(userId: string): Promise<any | null> {
  if (!pool) return null;
  const result = await pool.query(
    `SELECT config FROM openclaw_configs WHERE user_id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].config;
}

export async function dbUpsertOpenClawConfig(userId: string, config: any): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO openclaw_configs (user_id, config) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET config = EXCLUDED.config`,
    [userId, JSON.stringify(config)]
  );
}
