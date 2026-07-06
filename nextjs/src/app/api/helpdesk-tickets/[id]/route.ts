import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "view-helpdesk-tickets")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const actorEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true } }) : null;

  const { id } = await ctx.params;
  const ticketId = BigInt(id);

  const ticket = await prisma.helpdeskTicket.findFirst({
    where: { id: ticketId },
    select: {
      id: true,
      ticketId: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      categoryId: true,
      createdBy: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!ticket) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  // Match Laravel: allow superadmin + any; or owner when user has manage-own.
  if (!perms.includes("*") && !hasPermission(perms, "manage-any-helpdesk-tickets")) {
    if (!hasPermission(perms, "manage-own-helpdesk-tickets") || !actor?.id || ticket.createdBy?.toString?.() !== actor.id.toString()) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
  }

  const replies = await prisma.helpdeskReply.findMany({
    where: { ticketId: ticket.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdBy: true, message: true, attachments: true, isInternal: true, createdAt: true },
  });

  const category = ticket.categoryId
    ? await prisma.helpdeskCategory.findFirst({ where: { id: ticket.categoryId }, select: { id: true, name: true, color: true, isActive: true } }).catch(() => null)
    : null;

  const userIds = Array.from(
    new Set(
      [ticket.createdBy?.toString?.(), ...replies.map((r) => r.createdBy?.toString?.())]
        .filter(Boolean) as string[],
    ),
  );

  const users = userIds.length
    ? await prisma.user
        .findMany({ where: { id: { in: userIds.map((s) => BigInt(s)) } }, select: { id: true, name: true, email: true, type: true } })
        .catch(() => [])
    : [];
  const usersById = new Map(
    users.map((u) => [
      u.id.toString(),
      {
        id: u.id.toString(),
        name: u.name ?? "",
        email: u.email ?? "",
        type: u.type ?? null,
      },
    ]),
  );

  return NextResponse.json({
    ok: true,
    ticket: {
      ...ticket,
      id: ticket.id.toString(),
      categoryId: ticket.categoryId?.toString?.() ?? null,
      createdBy: ticket.createdBy?.toString?.() ?? null,
      title: ticket.title,
      category: category ? { id: category.id.toString(), name: category.name, color: category.color, is_active: category.isActive } : null,
      creator: ticket.createdBy ? usersById.get(ticket.createdBy.toString()) ?? null : null,
    },
    replies: replies.map((r) => ({
      id: r.id.toString(),
      ticket_id: ticket.id.toString(),
      message: r.message,
      attachments: r.attachments,
      is_internal: r.isInternal,
      created_by: r.createdBy?.toString?.() ?? null,
      creator: r.createdBy ? usersById.get(r.createdBy.toString()) ?? null : null,
      created_at: r.createdAt?.toISOString?.() ?? null,
    })),
  });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "edit-helpdesk-tickets")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const actorEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true, type: true } }) : null;

  const { id } = await ctx.params;
  const pk = BigInt(id);

  const existing = await prisma.helpdeskTicket.findFirst({ where: { id: pk }, select: { id: true, createdBy: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  if (!perms.includes("*") && !hasPermission(perms, "manage-any-helpdesk-tickets")) {
    if (!hasPermission(perms, "manage-own-helpdesk-tickets") || !actor?.id || existing.createdBy?.toString?.() !== actor.id.toString()) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
  }

  const body = (await req.json().catch(() => null)) as { [k: string]: unknown } | null;
  const title = String((body as any)?.title ?? "").trim();
  const description = String((body as any)?.description ?? "").trim();
  const status = String((body as any)?.status ?? "").trim();
  const priority = String((body as any)?.priority ?? "").trim();
  const categoryIdRaw = (body as any)?.category_id ?? (body as any)?.categoryId;

  if (!title) return NextResponse.json({ ok: false, message: "Title is required." }, { status: 400 });
  if (!description) return NextResponse.json({ ok: false, message: "Description is required." }, { status: 400 });

  await prisma.helpdeskTicket.update({
    where: { id: pk },
    data: {
      title,
      description,
      status: status || undefined,
      priority: priority || undefined,
      categoryId: categoryIdRaw != null && String(categoryIdRaw).trim() ? BigInt(String(categoryIdRaw).trim()) : null,
      resolvedAt: status === "resolved" ? new Date() : undefined,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "delete-helpdesk-tickets")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const actorEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true } }) : null;

  const { id } = await ctx.params;
  const pk = BigInt(id);

  const existing = await prisma.helpdeskTicket.findFirst({ where: { id: pk }, select: { id: true, createdBy: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  if (!perms.includes("*") && !hasPermission(perms, "manage-any-helpdesk-tickets")) {
    if (!hasPermission(perms, "manage-own-helpdesk-tickets") || !actor?.id || existing.createdBy?.toString?.() !== actor.id.toString()) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
  }

  await prisma.helpdeskReply.deleteMany({ where: { ticketId: existing.id } }).catch(() => null);
  await prisma.helpdeskTicket.delete({ where: { id: pk } });

  return NextResponse.json({ ok: true });
}

