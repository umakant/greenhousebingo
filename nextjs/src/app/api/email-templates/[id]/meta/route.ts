import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function requirePerm(req: NextRequest, perm: string) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, perm) && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = requirePerm(req, "edit-email-templates");
  if (blocked) return blocked;

  const { id } = await ctx.params;
  const templateId = BigInt(id);

  const body = (await req.json().catch(() => null)) as any;
  const from = typeof body?.from === "string" ? body.from.trim() : "";
  if (!from) return NextResponse.json({ ok: false, message: "From is required." }, { status: 400 });

  const existing = await prisma.emailTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  await prisma.emailTemplate.update({ where: { id: templateId }, data: { from, updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

