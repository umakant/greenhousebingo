import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "edit-helpdesk-categories") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const actorEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true } }) : null;

  const { id } = await ctx.params;
  const pk = BigInt(id);

  const existing = await prisma.helpdeskCategory.findFirst({ where: { id: pk }, select: { id: true, createdBy: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  if (!perms.includes("*") && existing.createdBy?.toString?.() !== actor?.id?.toString?.()) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { [k: string]: unknown } | null;
  const name = String((body as any)?.name ?? "").trim();
  const description = String((body as any)?.description ?? "").trim();
  const color = String((body as any)?.color ?? "#3B82F6").trim() || "#3B82F6";
  const isActive = Boolean((body as any)?.is_active ?? (body as any)?.isActive ?? true);

  if (!name) return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });

  await prisma.helpdeskCategory.update({
    where: { id: pk },
    data: { name, description: description || null, color, isActive, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "delete-helpdesk-categories") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const actorEmail = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = actorEmail ? await prisma.user.findFirst({ where: { email: actorEmail }, select: { id: true } }) : null;

  const { id } = await ctx.params;
  const pk = BigInt(id);

  const existing = await prisma.helpdeskCategory.findFirst({ where: { id: pk }, select: { id: true, createdBy: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  if (!perms.includes("*") && existing.createdBy?.toString?.() !== actor?.id?.toString?.()) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  await prisma.helpdeskCategory.delete({ where: { id: pk } });
  return NextResponse.json({ ok: true });
}

