import "server-only";

import QRCode from "qrcode";

import type { CompanySiteWorkshopTicket } from "@/lib/company-themes/company-site-workshop-service";
import { getEffectiveMailSettings, getSettingsForOwner, resolvePlatformAppName } from "@/lib/settings-service";
import { createSmtpTransportFromSettings, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";

export type SendCompanySiteWorkshopEmailParams = {
  ownerId: bigint;
  companySlug: string;
  to: string;
  attendeeName: string;
  orderReference: string;
  mode: "checkout" | "reserve";
  tickets: CompanySiteWorkshopTicket[];
  customerNotes?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTimeRange(startsAt: string, endsAt?: string): string {
  const start = new Date(startsAt);
  const end = endsAt ? new Date(endsAt) : new Date(start.getTime() + 8 * 60 * 60 * 1000);
  const datePart = start.toLocaleString(undefined, { dateStyle: "full" });
  const startTime = start.toLocaleString(undefined, { timeStyle: "short" });
  const endTime = end.toLocaleString(undefined, { timeStyle: "short" });
  return `${datePart} · ${startTime} – ${endTime}`;
}

function bookingStatusLabel(status: string, mode: "checkout" | "reserve"): string {
  if (status === "confirmed") return "Confirmed";
  if (status === "pending" && mode === "reserve") return "Reserved — payment pending";
  if (status === "pending") return "Pending confirmation";
  return status.replace(/_/g, " ");
}

async function qrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
    color: { dark: "#111827", light: "#ffffff" },
  });
}

function buildTicketSection(
  ticket: CompanySiteWorkshopTicket,
  qrImage: string,
  mode: "checkout" | "reserve",
): string {
  const seatLabel =
    ticket.quantityTotal > 1 ? `Seat ${ticket.seatNumber} of ${ticket.quantityTotal}` : "General admission";

  return `
    <div style="border:1px solid #e5e7eb;border-radius:16px;padding:24px;margin:0 0 24px;background:#ffffff;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#dc2626;">Workshop ticket</p>
      <h2 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111827;">${escapeHtml(ticket.eventTitle)}</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#475569;">${escapeHtml(bookingStatusLabel(ticket.bookingStatus, mode))}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#64748b;width:120px;vertical-align:top;">When</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;">${escapeHtml(formatDateTimeRange(ticket.startsAt, ticket.endsAt))}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#64748b;vertical-align:top;">Location</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;">${escapeHtml(ticket.locationLabel)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#64748b;vertical-align:top;">Attendee</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;">${escapeHtml(ticket.attendeeName)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#64748b;vertical-align:top;">Ticket</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;">${escapeHtml(seatLabel)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#64748b;vertical-align:top;">Amount</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;">$${ticket.unitPrice.toFixed(2)} USD</td>
        </tr>
      </table>
      <div style="text-align:center;margin:24px 0;">
        <img src="${qrImage}" alt="Workshop check-in QR code" width="220" height="220" style="display:inline-block;border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#ffffff;" />
        <p style="margin:12px 0 0;font-family:monospace;font-size:12px;color:#64748b;">${escapeHtml(ticket.qrToken)}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#64748b;">Show this QR code at workshop check-in.</p>
      </div>
    </div>
  `;
}

function buildHtml(params: SendCompanySiteWorkshopEmailParams, companyName: string, ticketSections: string, ticketUrl: string): string {
  const intro =
    params.mode === "reserve"
      ? "Your workshop seat is reserved. Bring the QR code below to check in on the day of the event."
      : "Thank you for registering. Your payment is confirmed and your workshop ticket is ready.";

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#111827;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;padding:32px;">
        <p style="margin:0 0 8px;font-size:13px;color:#64748b;">${escapeHtml(companyName)}</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">Your workshop ticket${params.tickets.length > 1 ? "s are" : " is"} ready</h1>
        <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#475569;">Hi ${escapeHtml(params.attendeeName)},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">${intro}</p>
        <p style="margin:0 0 24px;font-size:14px;color:#64748b;">Reference: <strong style="color:#111827;">${escapeHtml(params.orderReference)}</strong></p>
        ${ticketSections}
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 18px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#991b1b;">Important information</p>
          <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#7f1d1d;">
            <li>Arrive early for registration and bring a valid photo ID.</li>
            <li>Location details may be emailed separately closer to the event date.</li>
            <li>Enrollment covers one student per ticket; an signed NDA may be required at entry.</li>
            <li>Save this email or open your ticket page if you need to retrieve your QR code later.</li>
          </ul>
        </div>
        ${
          params.customerNotes
            ? `<p style="margin:0 0 24px;font-size:14px;color:#475569;"><strong>Your notes:</strong> ${escapeHtml(params.customerNotes)}</p>`
            : ""
        }
        <div style="text-align:center;">
          <a href="${escapeHtml(ticketUrl)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:8px;">View ticket online</a>
        </div>
      </div>
      <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#94a3b8;">If you did not request this registration, please contact ${escapeHtml(companyName)}.</p>
    </div>
  </body>
</html>`;
}

function buildText(params: SendCompanySiteWorkshopEmailParams, companyName: string, ticketUrl: string): string {
  const lines = [
    `${companyName}`,
    `Your workshop ticket${params.tickets.length > 1 ? "s" : ""}`,
    "",
    `Hi ${params.attendeeName},`,
    params.mode === "reserve"
      ? "Your workshop seat is reserved. Use the QR token(s) below at check-in."
      : "Thank you for registering. Your workshop ticket is confirmed.",
    "",
    `Reference: ${params.orderReference}`,
    `View online: ${ticketUrl}`,
    "",
  ];

  for (const ticket of params.tickets) {
    lines.push(
      `--- ${ticket.eventTitle} ---`,
      `When: ${formatDateTimeRange(ticket.startsAt, ticket.endsAt)}`,
      `Location: ${ticket.locationLabel}`,
      `Attendee: ${ticket.attendeeName}`,
      ticket.quantityTotal > 1 ? `Seat: ${ticket.seatNumber} of ${ticket.quantityTotal}` : "",
      `Amount: $${ticket.unitPrice.toFixed(2)} USD`,
      `QR token: ${ticket.qrToken}`,
      "",
    );
  }

  if (params.customerNotes) {
    lines.push(`Notes: ${params.customerNotes}`, "");
  }

  lines.push("Bring a valid photo ID to check in on the day of the workshop.");
  return lines.filter(Boolean).join("\n");
}

export async function sendCompanySiteWorkshopTicketEmail(
  params: SendCompanySiteWorkshopEmailParams,
): Promise<{ ok: boolean; error?: string }> {
  const to = params.to.trim().toLowerCase();
  if (!to.includes("@") || params.tickets.length === 0) {
    return { ok: false, error: "Invalid recipient or no workshop tickets." };
  }

  try {
    const settings = await getEffectiveMailSettings(params.ownerId);
    const smtp = parseSmtpFromSettingsBlob(settings);
    if (smtp.driver !== "smtp" || !smtp.host) {
      return { ok: false, error: "SMTP is not configured for this company." };
    }
    const fromAddress = (smtp.fromAddress || smtp.username || "").trim();
    if (!fromAddress) {
      return { ok: false, error: "SMTP from address is missing." };
    }

    const ownerSettings = await getSettingsForOwner(params.ownerId);
    const companyName =
      ownerSettings.company_name?.trim() ||
      ownerSettings.titleText?.trim() ||
      resolvePlatformAppName(ownerSettings);

    const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
    const ticketUrl = `${appBase}/sites/${encodeURIComponent(params.companySlug)}/ticket/${encodeURIComponent(params.orderReference)}?email=${encodeURIComponent(to)}`;

    const qrImages = await Promise.all(params.tickets.map((ticket) => qrDataUrl(ticket.qrToken)));
    const ticketSections = params.tickets
      .map((ticket, index) => buildTicketSection(ticket, qrImages[index]!, params.mode))
      .join("");

    const subject =
      params.tickets.length === 1
        ? `Your workshop ticket — ${params.tickets[0]!.eventTitle}`
        : `Your workshop tickets (${params.tickets.length}) — ${companyName}`;

    const html = buildHtml(params, companyName, ticketSections, ticketUrl);
    const text = buildText(params, companyName, ticketUrl);

    const transporter = createSmtpTransportFromSettings(settings);
    if (!transporter) {
      return { ok: false, error: "Could not create mail transport." };
    }

    await transporter.sendMail({
      from: { name: companyName, address: fromAddress },
      to,
      subject,
      html,
      text,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to send workshop email." };
  }
}

/** Best-effort — never throws. */
export function sendCompanySiteWorkshopTicketEmailAsync(params: SendCompanySiteWorkshopEmailParams): void {
  void sendCompanySiteWorkshopTicketEmail(params).then((result) => {
    if (!result.ok) {
      console.warn("[company-site/workshop-email]", result.error);
    }
  });
}
