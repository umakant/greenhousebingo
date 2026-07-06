import type { SettingsBlob } from "@/lib/settings-service";

function stripQuotes(v: string): string {
  let s = v.trim();
  if (s.length >= 2 && ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'")))) {
    s = s.slice(1, -1);
  }
  return s;
}

/**
 * When `MAIL_HOST` or `SMTP_HOST` is set, merge Laravel-style mail env into the settings blob.
 * Overrides DB `email_*` keys for this process (handy for dev or single SMTP for the whole deployment).
 *
 * Supported: MAIL_MAILER, MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_ENCRYPTION,
 * MAIL_FROM_ADDRESS, MAIL_FROM_NAME (and SMTP_* aliases where noted in merge).
 */
export function mergeSmtpFromEnv(settings: SettingsBlob): SettingsBlob {
  const host = (process.env.MAIL_HOST ?? process.env.SMTP_HOST ?? "").trim();
  if (!host) return settings;

  const driver = (process.env.MAIL_MAILER ?? process.env.SMTP_MAILER ?? "smtp").trim().toLowerCase() || "smtp";
  const port = (process.env.MAIL_PORT ?? process.env.SMTP_PORT ?? "587").trim();
  const username = (process.env.MAIL_USERNAME ?? process.env.SMTP_USER ?? "").trim();
  const password = (process.env.MAIL_PASSWORD ?? process.env.SMTP_PASSWORD ?? "").trim();
  let enc = (process.env.MAIL_ENCRYPTION ?? process.env.SMTP_ENCRYPTION ?? "tls").trim().toLowerCase();
  if (!enc) enc = "tls";

  const fromAddress = stripQuotes(process.env.MAIL_FROM_ADDRESS ?? process.env.SMTP_FROM ?? "");
  const fromNameRaw = process.env.MAIL_FROM_NAME ?? process.env.SMTP_FROM_NAME ?? "";
  const fromName = fromNameRaw ? stripQuotes(fromNameRaw) : "";

  return {
    ...settings,
    email_provider: settings.email_provider?.trim() || "smtp",
    email_driver: driver,
    email_host: host,
    email_port: port,
    email_username: username,
    email_password: password,
    email_encryption: enc,
    email_fromAddress: fromAddress || username,
    ...(fromName ? { email_fromName: fromName } : {}),
  };
}
