import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { getSettingsForOwner } from "@/lib/settings-service";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";

async function nextReplyId(): Promise<bigint> {
  const agg = await prisma.helpdeskReply.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

function toAttachmentBasenames(value: unknown): string[] {
  const arr = Array.isArray(value) ? value : value ? [value] : [];
  const out: string[] = [];
  for (const v of arr) {
    const s = String(v ?? "").trim();
    if (!s) continue;
    try {
      const u = s.startsWith("http") ? new URL(s) : null;
      const pathname = u ? u.pathname : s;
      const parts = pathname.split("/").filter(Boolean);
      const base = parts[parts.length - 1] || "";
      if (base) out.push(base);
    } catch {
      const parts = s.split("/").filter(Boolean);
      const base = parts[parts.length - 1] || "";
      if (base) out.push(base);
    }
  }
  return out;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "create-helpdesk-replies")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const ticketPk = BigInt(id);

  const ticket = await prisma.helpdeskTicket.findFirst({ where: { id: ticketPk }, select: { id: true } });
  if (!ticket) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { [k: string]: unknown } | null;
  const message = String((body as any)?.message ?? "").trim();
  if (!message) return NextResponse.json({ ok: false, message: "Message is required." }, { status: 400 });

  const actorEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = actorEmail
    ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true } })
    : null;

  const isInternal = actor?.type === "superadmin" ? Boolean((body as any)?.is_internal ?? (body as any)?.isInternal ?? false) : false;
  const attachments = toAttachmentBasenames((body as any)?.attachments);

  const reply = await prisma.helpdeskReply.create({
    data: {
      id: await nextReplyId(),
      ticketId: ticket.id,
      message,
      attachments: attachments.length ? attachments : undefined,
      isInternal,
      createdBy: actor?.id ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    select: { id: true, createdBy: true, message: true, attachments: true, isInternal: true, createdAt: true },
  });

  const creatorRaw = reply.createdBy
    ? await prisma.user.findFirst({ where: { id: reply.createdBy }, select: { id: true, name: true, email: true, type: true } }).catch(() => null)
    : null;
  const creator = creatorRaw ? { ...creatorRaw, id: creatorRaw.id.toString() } : null;

  const ticketFull = await prisma.helpdeskTicket.findFirst({
    where: { id: ticketPk },
    select: { id: true, ticketId: true, title: true, createdBy: true },
  });

  if (ticketFull?.createdBy && !reply.isInternal) {
    const settings = await getSettingsForOwner(ticketFull.createdBy);
    if (isCompanyEmailNotificationEnabled(settings, "New Helpdesk Ticket Reply")) {
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
      const ticketUrl = baseUrl ? `${baseUrl}/helpdesk-tickets/${ticketFull.id}` : "-";
      const ticketCreator = await prisma.user.findFirst({
        where: { id: ticketFull.createdBy },
        select: { email: true },
      });
      if (ticketCreator?.email?.trim()) {
        sendTemplatedEmailAsync({
          templateName: "New Helpdesk Ticket Reply",
          mailTo: [ticketCreator.email.trim()],
          ownerId: ticketFull.createdBy,
          variables: {
            ticket_name: ticketFull.title,
            ticket_id: ticketFull.ticketId,
            ticket_url: ticketUrl ? `<a href="${ticketUrl}" target="_blank">${ticketUrl}</a>` : "-",
            reply_description: message,
          },
        });
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      reply: {
        id: reply.id.toString(),
        ticket_id: ticket.id.toString(),
        message: reply.message,
        attachments: reply.attachments,
        is_internal: reply.isInternal,
        created_by: reply.createdBy?.toString?.() ?? null,
        creator,
        created_at: reply.createdAt?.toISOString?.() ?? null,
      },
    },
    { status: 201 },
  );
}

