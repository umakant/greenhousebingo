import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import {
  isMessengerPeerAllowedForCompanyActor,
  isMessengerPeerAllowedForSuperadminActor,
  isSuperadminMessengerActor,
} from "@/lib/messenger-peers";

function normalizeEmail(e: string) { return e.trim().toLowerCase(); }

async function getActor(req: NextRequest) {
  const email = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!email) return null;
  return prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
}

async function assertCanMessagePeer(
  actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null },
  peerId: bigint,
): Promise<boolean> {
  if (isSuperadminMessengerActor(actor)) {
    return isMessengerPeerAllowedForSuperadminActor(actor, peerId);
  }
  return isMessengerPeerAllowedForCompanyActor(actor, peerId);
}

function checkPerm(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  return perms.includes("*") || hasPermission(perms, "manage-messenger") || hasPermission(perms, "send-messages");
}

export async function GET(req: NextRequest) {
  if (!checkPerm(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const withId = req.nextUrl.searchParams.get("with");
  if (!withId) return NextResponse.json({ error: "Missing ?with=" }, { status: 400 });

  const peerId = BigInt(withId);

  const canPeer = await assertCanMessagePeer(actor, peerId);
  if (!canPeer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: actor.id, toId: peerId, deletedFromSender: false },
        { fromId: peerId, toId: actor.id, deletedFromReceiver: false },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fromId: true,
      toId: true,
      body: true,
      attachment: true,
      seen: true,
      createdAt: true,
    },
  });

  await prisma.message.updateMany({
    where: { fromId: peerId, toId: actor.id, seen: false },
    data: { seen: true },
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: String(m.id),
      from_id: String(m.fromId),
      to_id: String(m.toId),
      body: m.body ?? "",
      attachment: m.attachment,
      seen: m.seen,
      created_at: m.createdAt.toISOString(),
      is_mine: m.fromId === actor.id,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!checkPerm(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const toId = body.to_id ? BigInt(body.to_id) : null;
  const text = typeof body.body === "string" ? body.body.trim() : "";

  if (!toId || !text) return NextResponse.json({ error: "to_id and body are required" }, { status: 422 });

  const canPeer = await assertCanMessagePeer(actor, toId);
  if (!canPeer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const msg = await prisma.message.create({
    data: { fromId: actor.id, toId, body: text, seen: false },
    select: { id: true, fromId: true, toId: true, body: true, seen: true, createdAt: true },
  });

  return NextResponse.json({
    message: {
      id: String(msg.id),
      from_id: String(msg.fromId),
      to_id: String(msg.toId),
      body: msg.body ?? "",
      seen: msg.seen,
      created_at: msg.createdAt.toISOString(),
      is_mine: true,
    },
  }, { status: 201 });
}
