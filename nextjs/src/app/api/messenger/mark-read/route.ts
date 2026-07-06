import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }

export async function POST(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !hasPermission(perms, "manage-messenger") && !hasPermission(perms, "send-messages")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fromId = body.from_id ? BigInt(body.from_id) : null;
  if (!fromId) return NextResponse.json({ error: "from_id required" }, { status: 422 });

  await prisma.message.updateMany({
    where: { fromId, toId: actor.id, seen: false },
    data: { seen: true },
  });

  return NextResponse.json({ success: true });
}
