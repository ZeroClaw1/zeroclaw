/**
 * Email service for ZeroClaw.
 * Uses nodemailer with SMTP transport configured via environment variables.
 * Falls back to console logging when SMTP_HOST is not configured (local dev).
 */
import nodemailer, { type Transporter } from "nodemailer";

const FROM_ADDRESS = process.env.SMTP_FROM || "noreply@zeroclaw.ca";

/**
 * Create a fresh transporter each time to avoid caching broken connections.
 * Adds connection and greeting timeouts so Railway doesn't hang.
 */
function createTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // true for 465, false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000, // 10s to connect
    greetingTimeout: 10000,   // 10s for SMTP greeting
    socketTimeout: 15000,     // 15s for socket inactivity
  });
}

/**
 * Send an email. If no SMTP_HOST is configured, logs to console instead.
 * Throws a short, user-friendly error message on failure (not raw stack).
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const transporter = createTransporter();

  if (!transporter) {
    // Graceful degradation — log to console in local dev
    console.log(
      `[email] No SMTP configured — would send email:\n` +
        `  To: ${to}\n` +
        `  Subject: ${subject}\n` +
        `  Body: ${html.replace(/<[^>]+>/g, "").trim().slice(0, 200)}...`
    );
    return;
  }

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });
  } catch (err: any) {
    const code = err?.code || "UNKNOWN";
    console.error(`[email] SMTP send failed (${code}):`, err.message || err);

    // Throw a concise error the route handler can safely expose
    if (code === "ETIMEDOUT" || code === "ESOCKET" || code === "ECONNECTION") {
      throw new Error("Email service temporarily unavailable. Please try again later.");
    }
    if (code === "EAUTH") {
      throw new Error("Email service authentication error. Please contact support.");
    }
    throw new Error("Failed to send email. Please try again later.");
  }
}

/**
 * Send a password reset email with ZeroClaw branding (dark theme, teal accent).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const subject = "Reset your ZeroClaw password";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your ZeroClaw password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0a0e1a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
    }
    .wrapper {
      max-width: 520px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
    }
    .logo-mark {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #14b8a6, #0891b2);
      border-radius: 8px;
      display: inline-block;
    }
    .logo-text {
      font-size: 20px;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: -0.02em;
    }
    .card {
      background: #111827;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 32px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 12px 0;
      letter-spacing: -0.01em;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #14b8a6, #0891b2);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 13px 28px;
      border-radius: 8px;
      letter-spacing: 0.01em;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .divider {
      border: none;
      border-top: 1px solid #1e293b;
      margin: 28px 0;
    }
    .url-fallback {
      font-size: 13px;
      color: #64748b;
      word-break: break-all;
    }
    .url-fallback a {
      color: #14b8a6;
    }
    .expiry {
      font-size: 13px;
      color: #64748b;
      margin: 20px 0 0 0;
    }
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: #475569;
      text-align: center;
      line-height: 1.6;
    }
    .footer a {
      color: #14b8a6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <span class="logo-mark"></span>
      <span class="logo-text">ZeroClaw</span>
    </div>

    <div class="card">
      <h1>Reset your password</h1>
      <p>
        We received a request to reset the password for your ZeroClaw account
        associated with <strong style="color: #e2e8f0;">${to}</strong>.
        Click the button below to set a new password.
      </p>

      <a href="${resetUrl}" class="btn">Reset Password</a>

      <hr class="divider" />

      <p class="url-fallback">
        If the button above doesn't work, copy and paste this link into your browser:<br />
        <a href="${resetUrl}">${resetUrl}</a>
      </p>

      <p class="expiry">This link will expire in <strong>1 hour</strong>.</p>
    </div>

    <p class="footer">
      If you didn't request a password reset, you can safely ignore this email.
      Your password will not change.<br /><br />
      &copy; ${new Date().getFullYear()} ZeroClaw &mdash;
      <a href="https://zeroclaw.ca">zeroclaw.ca</a>
    </p>
  </div>
</body>
</html>`;

  await sendEmail(to, subject, html);
}
