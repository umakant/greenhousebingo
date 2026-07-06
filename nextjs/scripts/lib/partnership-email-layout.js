/**
 * SECURX partnership email layout (table + inline CSS for Gmail/Outlook).
 * Used by seed-partnership-email-templates.js
 */

const THEMES = {
  blue: { accent: "#2563eb", accentLight: "#eff6ff", border: "#bfdbfe" },
  orange: { accent: "#ea580c", accentLight: "#fff7ed", border: "#fed7aa" },
  yellow: { accent: "#ca8a04", accentLight: "#fefce8", border: "#fde047" },
  green: { accent: "#16a34a", accentLight: "#f0fdf4", border: "#bbf7d0" },
  red: { accent: "#dc2626", accentLight: "#fef2f2", border: "#fecaca" },
  purple: { accent: "#7c3aed", accentLight: "#f5f3ff", border: "#ddd6fe" },
};

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {object} opts
 * @param {"blue"|"orange"|"yellow"|"green"|"red"|"purple"} opts.theme
 * @param {string} opts.title
 * @param {string} opts.introHtml - HTML paragraphs after greeting
 * @param {Array<{label:string, value:string}>} opts.rows
 * @param {string} [opts.ctaHtml] - pre-built button HTML ({action_button})
 */
function buildPartnershipEmail(opts) {
  const t = THEMES[opts.theme] ?? THEMES.blue;
  const rowsHtml = (opts.rows ?? [])
    .map(
      (r) => `<tr>
        <td style="padding:10px 14px;font-size:13px;color:#64748b;width:42%;border-bottom:1px solid #e2e8f0;vertical-align:top;">${esc(r.label)}</td>
        <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;vertical-align:top;">${r.value}</td>
      </tr>`,
    )
    .join("");

  const ctaBlock = opts.ctaHtml
    ? `<tr><td colspan="2" style="padding:24px 28px 8px;text-align:center;">${opts.ctaHtml}</td></tr>`
    : "";

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0;padding:0;background-color:#e8eef5;">
  <tr>
    <td align="center" style="padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
        <tr>
          <td style="background:#0f172a;padding:24px 28px;text-align:center;">
            {logo_html}
            <p style="margin:12px 0 0;color:#94a3b8;font-size:12px;letter-spacing:0.04em;">Partnership Management</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${t.accentLight};border:1px solid ${t.border};border-radius:10px;border-left:4px solid ${t.accent};">
              <tr>
                <td style="padding:20px 22px;">
                  <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a;line-height:1.3;">${esc(opts.title)}</p>
                  <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.55;">Hello <strong>{recipient_name}</strong>,</p>
                  ${opts.introHtml}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              ${rowsHtml}
            </table>
          </td>
        </tr>
        ${ctaBlock}
        <tr>
          <td style="padding:16px 28px 28px;font-size:12px;color:#64748b;line-height:1.55;text-align:center;">
            <p style="margin:0;">Questions? Contact <a href="mailto:{support_email}" style="color:#2563eb;text-decoration:none;">{support_email}</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px;background:#0f172a;text-align:center;">
            <p style="margin:0;font-size:13px;font-weight:600;color:#f1f5f9;">{app_name} Partnership Management</p>
            <p style="margin:8px 0 0;font-size:11px;color:#94a3b8;">Powered by {company_name}</p>
            <p style="margin:14px 0 0;font-size:10px;color:#64748b;line-height:1.5;">This is an automated email. Please do not reply.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

module.exports = { buildPartnershipEmail, THEMES };
