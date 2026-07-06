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

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = requirePerm(req, "delete-newsletter-subscribers");
  if (blocked) return blocked;

  const { id } = await ctx.params;
  const subId = BigInt(id);
  const existing = await prisma.newsletterSubscriber.findUnique({ where: { id: subId }, select: { id: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  await prisma.newsletterSubscriber.delete({ where: { id: subId } });
  return NextResponse.json({ ok: true });
}

