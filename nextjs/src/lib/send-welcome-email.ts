import {
  getEffectiveMailSettings,
  getSettingsForOwner,
  getSuperadminId,
  resolvePlatformAppName,
} from "@/lib/settings-service";
import { parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";
import { sendTemplatedEmail } from "@/lib/send-templated-email";

export type WelcomeEmailPayload = {
  to: string;
  name: string;
  email: string;
  password: string;
  appUrl?: string;
  appName?: string;
  companyName?: string;
  /** When set, uses this company's Email Settings (SMTP) when configured; otherwise superadmin SMTP. */
  companyId?: bigint;
};

/** Primary CTA button (inline styles for email clients). */
function buildLoginLinkButton(appUrl: string | undefined, linkLabel: string): string {
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) return "-";
  const href = `${base}/login`;
  const label = linkLabel.trim() || "Sign in to your account";
  const style =
    "display:inline-block;background-color:#2563eb;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;line-height:1.25;padding:14px 32px;text-align:center;text-decoration:none;border-radius:8px;box-shadow:0 2px 8px rgba(37,99,235,0.35);";
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="${style}">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</a>`;
}

/**
 * Send welcome email with login details using the "New User" email template.
 * Uses superadmin SMTP settings (same as previous implementation). Does not throw; returns { ok, error }.
 */
export async function sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<{ ok: boolean; error?: string }> {
  const { to, name, email, password, companyName, appUrl, appName } = payload;
  const toNormalized = to.trim().toLowerCase();
  if (!toNormalized || !toNormalized.includes("@")) {
    return { ok: false, error: "Invalid recipient email." };
  }

  try {
    const superadminId = await getSuperadminId();
    const companyId = payload.companyId;
    /** Template language/content from superadmin defaults (reliable "New User" + en fallback in sendTemplatedEmail). */
    const ownerId = superadminId;
    let smtpOwnerId = superadminId;
    if (companyId != null) {
      const smtpSettings = await getEffectiveMailSettings(companyId);
      const parsed = parseSmtpFromSettingsBlob(smtpSettings);
      if (parsed.fromAddress && parsed.host) {
        smtpOwnerId = companyId;
      }
    }

    const ownerSettings = await getSettingsForOwner(superadminId);
    const displayAppName =
      appName?.trim() ||
      resolvePlatformAppName(ownerSettings);
    const ctaLabel = `Sign in to ${displayAppName}`;

    const result = await sendTemplatedEmail({
      templateName: "New User",
      mailTo: [toNormalized],
      ownerId,
      smtpOwnerId,
      variables: {
        name: name || "-",
        email: email || toNormalized,
        password: password || "-",
        company_name: companyName && companyName !== "-" ? companyName : "-",
        login_link: buildLoginLinkButton(appUrl, ctaLabel),
        app_name: displayAppName,
      },
    });

    if (!result.is_success) {
      return { ok: false, error: typeof result.error === "string" ? result.error : "Failed to send welcome email." };
    }
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send welcome email." };
  }
}
