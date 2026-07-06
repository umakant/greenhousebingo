import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import type { SettingsBlob } from "@/lib/settings-service";

export type ParsedSmtpSettings = {
  driver: string;
  host: string;
  port: number;
  username: string;
  password: string;
  encryption: string;
  fromAddress: string;
  /** Display name for `From:` (optional; from `email_fromName` / MAIL_FROM_NAME). */
  fromName: string;
};

/** Read SMTP-related keys from a settings blob (same keys as Laravel / Email Settings UI). */
export function parseSmtpFromSettingsBlob(s: SettingsBlob): ParsedSmtpSettings {
  const fromAddr = (s.email_fromAddress ?? s.email_username ?? "").trim();
  let fromName = (s.email_fromName ?? "").trim();
  if (fromName.length >= 2 && ((fromName.startsWith('"') && fromName.endsWith('"')) || (fromName.startsWith("'") && fromName.endsWith("'")))) {
    fromName = fromName.slice(1, -1);
  }
  return {
    driver: (s.email_driver ?? "smtp").trim().toLowerCase(),
    host: (s.email_host ?? "").trim(),
    port: parseInt((s.email_port ?? "587").trim(), 10) || 587,
    username: (s.email_username ?? "").trim(),
    password: s.email_password ?? "",
    encryption: (s.email_encryption ?? "tls").trim().toLowerCase(),
    fromAddress: fromAddr,
    fromName,
  };
}

/** RFC5322-style From header for Nodemailer when a display name is set. */
export function formatSmtpFromHeader(p: ParsedSmtpSettings): string {
  const addr = (p.fromAddress || p.username || "noreply@example.com").trim() || "noreply@example.com";
  const name = (p.fromName ?? "").trim();
  if (!name) return addr;
  const safe = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${safe}" <${addr}>`;
}

/**
 * Nodemailer transport aligned with typical Laravel SMTP behavior:
 * - Port 465 / ssl → implicit TLS (secure: true)
 * - Port 587 + tls → STARTTLS (secure: false, requireTLS: true)
 * - none → no TLS upgrade (ignoreTLS)
 */
export function createSmtpTransportFromSettings(settings: SettingsBlob): Transporter | null {
  const p = parseSmtpFromSettingsBlob(settings);
  if (p.driver !== "smtp" || !p.host) return null;

  const secure = p.encryption === "ssl" || p.port === 465;
  const requireTLS = p.encryption === "tls" && !secure;

  return nodemailer.createTransport({
    host: p.host,
    port: p.port,
    secure,
    requireTLS,
    ignoreTLS: p.encryption === "none",
    auth: p.username || p.password ? { user: p.username, pass: p.password } : undefined,
    tls:
      p.encryption === "tls" && !secure
        ? { rejectUnauthorized: false, minVersion: "TLSv1.2" as const }
        : undefined,
  });
}
