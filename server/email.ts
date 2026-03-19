/**
 * Email service for ZeroClaw.
 * Uses Resend HTTP API (SMTP is blocked on Railway).
 * Falls back to console logging when no API key is configured (local dev).
 */
import { Resend } from "resend";

// Resend supports friendly name format: "ZeroClaw <noreply@zeroclaw.ca>"
const RAW_FROM = process.env.SMTP_FROM || "noreply@zeroclaw.ca";
const FROM_ADDRESS = RAW_FROM.includes("<") ? RAW_FROM : `ZeroClaw <${RAW_FROM}>`;

// Use RESEND_API_KEY if set, otherwise fall back to SMTP_PASS (same key)
const API_KEY = process.env.RESEND_API_KEY || process.env.SMTP_PASS;

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!API_KEY) return null;
  if (!_resend) {
    _resend = new Resend(API_KEY);
  }
  return _resend;
}

/**
 * Send an email via Resend HTTP API.
 * If no API key is configured, logs to console instead.
 * Throws a short, user-friendly error message on failure.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const resend = getResend();

  if (!resend) {
    // Graceful degradation — log to console in local dev
    console.log(
      `[email] No Resend API key configured — would send email:\n` +
        `  To: ${to}\n` +
        `  Subject: ${subject}\n` +
        `  Body: ${html.replace(/<[^>]+>/g, "").trim().slice(0, 200)}...`
    );
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("[email] Resend API error:", error);
      throw new Error(error.message || "Failed to send email");
    }

    console.log(`[email] Sent successfully (id: ${data?.id})`);
  } catch (err: any) {
    // If it's already our user-friendly error, re-throw
    if (err.message && err.message.length < 120) {
      throw err;
    }
    console.error("[email] Send failed:", err.message || err);
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

  // Table-based layout with fully inline styles for email client compatibility.
  // Gmail strips <style> blocks, <body> bgcolor, flexbox, and gradients.
  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Reset your ZeroClaw password</title>
  <!--[if mso]>
  <style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0a0e1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<!-- Outer wrapper table for full-width dark background -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0e1a;">
  <tr>
    <td align="center" style="padding:40px 16px;">

      <!-- Content table -->
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">

        <!-- Logo row -->
        <tr>
          <td style="padding-bottom:28px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:36px;height:36px;background-color:#14b8a6;border-radius:8px;" width="36" height="36">&nbsp;</td>
                <td style="padding-left:10px;font-size:20px;font-weight:700;color:#f1f5f9;letter-spacing:-0.02em;">ZeroClaw</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background-color:#111827;border:1px solid #1e293b;border-radius:12px;padding:32px;">

            <!-- Heading -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-size:22px;font-weight:700;color:#f1f5f9;padding-bottom:12px;">Reset your password</td>
              </tr>
              <tr>
                <td style="font-size:15px;line-height:1.6;color:#94a3b8;padding-bottom:24px;">
                  We received a request to reset the password for your ZeroClaw account
                  associated with <strong style="color:#e2e8f0;">${to}</strong>.
                  Click the button below to set a new password.
                </td>
              </tr>

              <!-- CTA Button -->
              <tr>
                <td style="padding-bottom:28px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color:#14b8a6;border-radius:8px;text-align:center;">
                        <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Reset Password</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Divider -->
              <tr>
                <td style="border-top:1px solid #1e293b;padding-top:28px;font-size:13px;color:#64748b;line-height:1.6;word-break:break-all;">
                  If the button above doesn&rsquo;t work, copy and paste this link into your browser:<br />
                  <a href="${resetUrl}" style="color:#14b8a6;text-decoration:none;">${resetUrl}</a>
                </td>
              </tr>

              <!-- Expiry -->
              <tr>
                <td style="font-size:13px;color:#64748b;padding-top:20px;">
                  This link will expire in <strong style="color:#94a3b8;">1 hour</strong>.
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:32px;font-size:12px;color:#475569;text-align:center;line-height:1.6;">
            If you didn&rsquo;t request a password reset, you can safely ignore this email.
            Your password will not change.<br /><br />
            &copy; ${new Date().getFullYear()} ZeroClaw &mdash;
            <a href="https://zeroclaw.ca" style="color:#14b8a6;text-decoration:none;">zeroclaw.ca</a>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;

  await sendEmail(to, subject, html);
}
