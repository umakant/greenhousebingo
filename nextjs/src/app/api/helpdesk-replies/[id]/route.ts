import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "delete-helpdesk-replies") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const pk = BigInt(id);

  const existing = await prisma.helpdeskReply.findFirst({ where: { id: pk }, select: { id: true } });
  if (!existing) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  await prisma.helpdeskReply.delete({ where: { id: pk } });
  return NextResponse.json({ ok: true });
}

