import type { NextRequest } from "next/server";

import { getEffectiveMailSettings } from "@/lib/settings-service";
import { createSmtpTransportFromSettings, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";

function publicOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = (req.headers.get("x-forwarded-proto") ?? "http").split(",")[0]?.trim() || "http";
  if (host) return `${proto}://${host}`;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (base) return base;
  return "http://localhost:3000";
}

export async function sendStorefrontCustomerPasswordResetEmail(opts: {
  req: NextRequest;
  organizationId: bigint;
  to: string;
  resetUrl: string;
  storeName: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const settings = await getEffectiveMailSettings(opts.organizationId);
  const smtp = parseSmtpFromSettingsBlob(settings);
  if (smtp.driver !== "smtp") {
    return { ok: false, message: "Email is not configured (SMTP required)." };
  }
  const fromAddress = (smtp.fromAddress || smtp.username || "").trim();
  if (!smtp.host || !fromAddress) {
    return { ok: false, message: "SMTP is not fully configured for this store." };
  }
  const displayFrom = (settings.company_name ?? opts.storeName).trim() || "Store";

  try {
    const transporter = createSmtpTransportFromSettings(settings);
    if (!transporter) {
      return { ok: false, message: "Could not create SMTP transport." };
    }
    await transporter.sendMail({
      from: { name: displayFrom, address: fromAddress },
      to: opts.to,
      subject: `Reset your password — ${displayFrom}`,
      text: `Reset your password:\n${opts.resetUrl}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Reset your password:</p><p><a href="${opts.resetUrl}">${opts.resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`,
    });
    return { ok: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to send email.";
    return { ok: false, message };
  }
}

export function buildStorefrontAccountResetUrl(req: NextRequest, websiteId: string, token: string): string {
  const origin = publicOrigin(req);
  const path = `/storefront/account/w/${websiteId}/reset-password?token=${encodeURIComponent(token)}`;
  return `${origin}${path}`;
}
