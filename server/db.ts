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

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT
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
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
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
