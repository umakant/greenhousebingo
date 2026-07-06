import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getEffectiveMailSettings, getSuperadminId } from "@/lib/settings-service";
import { createSmtpTransportFromSettings, parseSmtpFromSettingsBlob } from "@/lib/smtp-from-settings";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Where Water Ice Express contact-form messages are delivered. Overridable via env. */
const CONTACT_INBOX = (process.env.WATERICE_CONTACT_EMAIL ?? "supports@watericeexpressllc.com").trim();

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function emailInbox(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const to = CONTACT_INBOX.toLowerCase();
  if (!EMAIL_RE.test(to)) return { ok: false, error: "Contact inbox is not configured." };

  try {
    const superadminId = await getSuperadminId();
    const settings = await getEffectiveMailSettings(superadminId);
    const smtp = parseSmtpFromSettingsBlob(settings);
    const fromAddress = (smtp.fromAddress || smtp.username || "").trim();
    if (smtp.driver !== "smtp" || !smtp.host || !fromAddress) {
      return { ok: false, error: "SMTP is not configured." };
    }
    const transporter = createSmtpTransportFromSettings(settings);
    if (!transporter) return { ok: false, error: "Could not create SMTP transport." };

    const displayFrom = (smtp.fromName || settings.company_name || "Water Ice Express").trim() || "Water Ice Express";
    const text = [
      `New contact message from the Water Ice Express website.`,
      ``,
      `Name: ${params.name}`,
      `Email: ${params.email}`,
      `Subject: ${params.subject}`,
      ``,
      params.message,
    ].join("\n");
    const html = `
<p>New contact message from the Water Ice Express website.</p>
<ul>
  <li><strong>Name:</strong> ${escapeHtml(params.name)}</li>
  <li><strong>Email:</strong> ${escapeHtml(params.email)}</li>
  <li><strong>Subject:</strong> ${escapeHtml(params.subject)}</li>
</ul>
<p style="white-space:pre-wrap">${escapeHtml(params.message)}</p>
`.trim();

    await transporter.sendMail({
      from: { name: displayFrom, address: fromAddress },
      to,
      replyTo: params.email,
      subject: `[Website] ${params.subject}`,
      text,
      html,
    });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send email." };
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = body?.name != null ? String(body.name).trim() : "";
  const email = body?.email != null ? String(body.email).trim().toLowerCase() : "";
  const subjectInput = body?.subject != null ? String(body.subject).trim() : "";
  const message = body?.message != null ? String(body.message).trim() : "";

  if (!name || name.length > 200) {
    return NextResponse.json({ ok: false, error: "Please enter your name." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!message || message.length > 8000) {
    return NextResponse.json({ ok: false, error: "Please enter a message." }, { status: 400 });
  }
  const subject = (subjectInput || "Website enquiry").slice(0, 200);

  // Persist first so a submission is never lost, even if SMTP delivery fails.
  try {
    await prisma.stContact.create({
      data: { name, email, subject, message: message || null },
    });
  } catch (e) {
    console.error("[waterice-contact] persist failed", e);
    return NextResponse.json({ ok: false, error: "Could not submit your message. Please try again." }, { status: 500 });
  }

  // Best-effort email notification; submission is already saved if this fails.
  const mailed = await emailInbox({ name, email, subject, message });
  if (!mailed.ok) {
    console.warn("[waterice-contact] email notification skipped:", mailed.error);
  }

  return NextResponse.json({ ok: true });
}
