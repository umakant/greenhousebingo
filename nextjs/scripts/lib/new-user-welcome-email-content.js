/**
 * Shared "New User" / welcome-login email (HTML + subject + variables map).
 * Used by seed-email-templates.js and patch-new-user-email-template.js.
 * Table layout + inline CSS for Gmail/Outlook; variables {name}, {email}, etc.
 */

const SUBJECT = "Welcome to {app_name} — your login details";

const VARIABLES = {
  "App Name": "app_name",
  "Company Name": "company_name",
  "App Url": "app_url",
  "Login Link": "login_link",
  Name: "name",
  Email: "email",
  Password: "password",
};

/** Refined Paper Flight–style welcome: readable type scale, clear credential block, CTA, security note. */
const HTML_EN = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#e8eef5;">
  <tr>
    <td align="center" style="padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0c4a6e 100%);padding:32px 28px;text-align:center;">
            <p style="margin:0;color:#f8fafc;font-size:22px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;">{app_name}</p>
            <p style="margin:12px 0 0;color:#cbd5e1;font-size:15px;line-height:1.5;font-weight:400;">Your account is ready</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 28px 8px;color:#0f172a;font-size:16px;line-height:1.65;">
            <p style="margin:0 0 8px;font-size:15px;color:#64748b;">Hello <strong style="color:#0f172a;">{name}</strong>,</p>
            <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.6;">Thank you for joining <strong style="color:#0f172a;">{app_name}</strong>. Use the sign-in details below to access your company portal anytime.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;border-left:4px solid #2563eb;margin:0 0 24px;">
              <tr>
                <td style="padding:20px 22px;">
                  <p style="margin:0 0 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;font-weight:700;">Sign-in email</p>
                  <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#0f172a;word-break:break-all;">{email}</p>
                  <p style="margin:0 0 14px;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;font-weight:700;">Temporary password</p>
                  <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;font-family:ui-monospace,Consolas,'SF Mono',monospace;letter-spacing:0.06em;background:#fff;padding:12px 14px;border-radius:6px;border:1px dashed #cbd5e1;display:inline-block;">{password}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;text-align:center;">{login_link}</p>
            <p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.55;border-top:1px solid #e2e8f0;padding-top:16px;">For security, sign in soon and change this password under your account settings. Do not share these credentials.</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 28px 28px;background:#f1f5f9;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:13px;font-weight:600;color:#475569;">{company_name}</p>
            <p style="margin:10px 0 0;font-size:12px;color:#64748b;line-height:1.5;">{app_url}</p>
            <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;">This message was sent because an administrator created an account for this email address.</p>
          </td>
        </tr>
      </table>
      <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.4;">© {app_name}</p>
    </td>
  </tr>
</table>`;

module.exports = {
  SUBJECT,
  VARIABLES,
  HTML_EN,
};
