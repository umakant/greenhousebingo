import "server-only";

import { getEffectiveMailSettings, getPlatformAppName } from "@/lib/settings-service";
import { createSmtpTransportFromSettings, formatSmtpFromHeader, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";
import { buildHostInviteUrl } from "@/lib/event-platform/hosts/host-service";

export async function sendEventHostInviteEmail(opts: {
  organizationId: bigint;
  to: string;
  hostName: string;
  eventTitle: string;
  eventStartsAt: Date;
  venueLabel: string | null;
  inviteToken: string;
  message?: string | null;
}): Promise<{ ok: boolean; message?: string; devLink?: string }> {
  const inviteUrl = buildHostInviteUrl(opts.inviteToken);
  const appName = await getPlatformAppName();
  const settings = await getEffectiveMailSettings(opts.organizationId);
  const smtp = parseSmtpFromSettingsBlob(settings);

  const when = opts.eventStartsAt.toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" });
  const venue = opts.venueLabel?.trim() || "TBA";
  const personalNote = opts.message?.trim()
    ? `<p style="margin:16px 0;padding:12px;background:#f4f4f5;border-radius:8px"><em>${escapeHtml(opts.message)}</em></p>`
    : "";

  if (smtp.driver !== "smtp" || !smtp.host) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, message: "Outgoing email is not configured." };
    }
    return {
      ok: true,
      message: "Email is not configured (dev only). Use the invite link below.",
      devLink: inviteUrl,
    };
  }

  const transporter = createSmtpTransportFromSettings(settings);
  if (!transporter) {
    return { ok: false, message: "SMTP is not configured correctly." };
  }

  const subject = `You're invited to host: ${opts.eventTitle}`;
  const text = [
    `Hello ${opts.hostName},`,
    "",
    `You've been invited to host an event on ${appName}.`,
    "",
    `Event: ${opts.eventTitle}`,
    `When: ${when}`,
    `Where: ${venue}`,
    opts.message?.trim() ? `\nMessage: ${opts.message.trim()}\n` : "",
    `Respond to this invitation:`,
    inviteUrl,
  ].join("\n");

  const html = `
    <p>Hello ${escapeHtml(opts.hostName)},</p>
    <p>You've been invited to host an event on <strong>${escapeHtml(appName)}</strong>.</p>
    <ul>
      <li><strong>Event:</strong> ${escapeHtml(opts.eventTitle)}</li>
      <li><strong>When:</strong> ${escapeHtml(when)}</li>
      <li><strong>Where:</strong> ${escapeHtml(venue)}</li>
    </ul>
    ${personalNote}
    <p><a href="${inviteUrl}" style="display:inline-block;padding:10px 16px;background:#ea580c;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">View invitation</a></p>
    <p style="color:#71717a;font-size:13px">Or copy this link: <a href="${inviteUrl}">${inviteUrl}</a></p>
  `;

  await transporter.sendMail({
    from: formatSmtpFromHeader(smtp),
    to: opts.to,
    subject,
    text,
    html,
  });

  return { ok: true, message: `Invitation email sent to ${opts.to}.` };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
