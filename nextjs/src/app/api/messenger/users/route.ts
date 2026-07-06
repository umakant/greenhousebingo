import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import {
  isSuperadminMessengerActor,
  loadExtraMessengerPeerIds,
  resolveMessengerTenantCompanyId,
} from "@/lib/messenger-peers";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!perms.includes("*") && !hasPermission(perms, "manage-messenger") && !hasPermission(perms, "send-messages")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
  if (!actor?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = resolveMessengerTenantCompanyId(actor);
  const extraPeerIds = isSuperadminMessengerActor(actor) ? [] : await loadExtraMessengerPeerIds(companyId);

  const list = await prisma.user.findMany({
    where: isSuperadminMessengerActor(actor)
      ? {
          id: { not: actor.id },
          NOT: { type: { in: ["superadmin", "super_admin"] } },
          OR: [
            { type: { in: ["company", "company_admin"] } },
            { createdBy: { not: null } },
          ],
        }
      : {
          id: { not: actor.id },
          NOT: { type: { in: ["superadmin", "super_admin"] } },
          OR: [
            { createdBy: companyId },
            { creatorId: companyId },
            ...(extraPeerIds.length ? [{ id: { in: extraPeerIds } }] : []),
          ],
        },
    select: { id: true, name: true, email: true, avatar: true },
    orderBy: { name: "asc" },
    take: 500,
  });

  /** Include super admins who already have a message thread with this user (otherwise inbound admin messages never appear in the list). */
  let mergedList = list;
  if (!isSuperadminMessengerActor(actor)) {
    const threadRows = await prisma.message.findMany({
      where: {
        OR: [
          { toId: actor.id, deletedFromReceiver: false },
          { fromId: actor.id, deletedFromSender: false },
        ],
      },
      select: { fromId: true, toId: true },
    });
    const peerIds = new Set<bigint>();
    for (const r of threadRows) {
      peerIds.add(r.fromId === actor.id ? r.toId : r.fromId);
    }
    const existingIds = new Set(list.map((u) => u.id));
    const missingSa = [...peerIds].filter((id) => !existingIds.has(id));
    if (missingSa.length > 0) {
      const saPeers = await prisma.user.findMany({
        where: { id: { in: missingSa }, type: { in: ["superadmin", "super_admin"] } },
        select: { id: true, name: true, email: true, avatar: true },
      });
      if (saPeers.length > 0) mergedList = [...list, ...saPeers];
    }
  }

  const userIds = mergedList.map((u) => u.id);

  const [lastMessages, unreadCounts, favorites] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [
          { fromId: actor.id, toId: { in: userIds }, deletedFromSender: false },
          { toId: actor.id, fromId: { in: userIds }, deletedFromReceiver: false },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { fromId: true, toId: true, body: true, createdAt: true, seen: true },
    }),
    prisma.message.groupBy({
      by: ["fromId"],
      where: { toId: actor.id, seen: false, deletedFromReceiver: false },
      _count: { id: true },
    }),
    prisma.messengerFavorite.findMany({
      where: { userId: actor.id },
      select: { favoriteId: true },
    }),
  ]);

  const lastMessageMap = new Map<string, { body: string; created_at: string }>();
  for (const m of lastMessages) {
    const peerId = m.fromId === actor.id ? String(m.toId) : String(m.fromId);
    if (!lastMessageMap.has(peerId)) {
      lastMessageMap.set(peerId, {
        body: m.body ?? "",
        created_at: m.createdAt.toISOString(),
      });
    }
  }

  const unreadMap = new Map<string, number>();
  for (const g of unreadCounts) {
    unreadMap.set(String(g.fromId), g._count.id);
  }

  const favoriteSet = new Set(favorites.map((f) => String(f.favoriteId)));

  const users = mergedList.map((u) => ({
    id: String(u.id),
    name: u.name ?? u.email ?? "",
    email: u.email,
    avatar: u.avatar,
    last_message: lastMessageMap.get(String(u.id)) ?? null,
    unread_count: unreadMap.get(String(u.id)) ?? 0,
    is_online: false,
    is_favorite: favoriteSet.has(String(u.id)),
  }));

  users.sort((a, b) => {
    const aTime = a.last_message?.created_at ?? "";
    const bTime = b.last_message?.created_at ?? "";
    if (aTime && bTime) return bTime.localeCompare(aTime);
    if (aTime) return -1;
    if (bTime) return 1;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  return NextResponse.json({ users });
}
