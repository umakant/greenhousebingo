import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !hasPermission(perms, "manage-messenger") && !hasPermission(perms, "send-messages")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const msgId = BigInt(id);

  const msg = await prisma.message.findUnique({
    where: { id: msgId },
    select: { fromId: true, toId: true, deletedFromSender: true, deletedFromReceiver: true },
  });
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSender = msg.fromId === actor.id;
  const isReceiver = msg.toId === actor.id;
  if (!isSender && !isReceiver) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updateData = isSender
    ? { deletedFromSender: true }
    : { deletedFromReceiver: true };

  const updated = await prisma.message.update({ where: { id: msgId }, data: updateData });

  if (updated.deletedFromSender && updated.deletedFromReceiver) {
    await prisma.message.delete({ where: { id: msgId } });
  }

  return NextResponse.json({ success: true });
}
