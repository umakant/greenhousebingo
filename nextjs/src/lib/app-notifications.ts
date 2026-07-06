import "server-only";

import { prisma } from "@/lib/prisma";

export type AppNotificationInput = {
  userId: bigint | string | number;
  organizationId?: bigint | string | number | null;
  module?: string | null;
  type?: string | null;
  title: string;
  body?: string | null;
  link?: string | null;
};

export type SerializedAppNotification = {
  id: string;
  module: string | null;
  type: string | null;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
};

function toBigInt(v: bigint | string | number | null | undefined): bigint | null {
  if (v == null || v === "") return null;
  try {
    return BigInt(v);
  } catch {
    return null;
  }
}

/** Creates one in-app notification. Best-effort: never throws. */
export async function createAppNotification(input: AppNotificationInput): Promise<void> {
  const userId = toBigInt(input.userId);
  if (userId == null || !input.title.trim()) return;
  try {
    await prisma.appNotification.create({
      data: {
        userId,
        organizationId: toBigInt(input.organizationId),
        module: input.module ?? null,
        type: input.type ?? null,
        title: input.title.trim().slice(0, 255),
        body: input.body?.trim() || null,
        link: input.link?.trim() || null,
      },
    });
  } catch {
    /* in-app notifications are best-effort */
  }
}

/** Creates many in-app notifications in one insert. Best-effort: never throws. */
export async function createAppNotifications(inputs: AppNotificationInput[]): Promise<void> {
  const data = inputs
    .map((i) => {
      const userId = toBigInt(i.userId);
      if (userId == null || !i.title.trim()) return null;
      return {
        userId,
        organizationId: toBigInt(i.organizationId),
        module: i.module ?? null,
        type: i.type ?? null,
        title: i.title.trim().slice(0, 255),
        body: i.body?.trim() || null,
        link: i.link?.trim() || null,
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);
  if (data.length === 0) return;
  try {
    await prisma.appNotification.createMany({ data });
  } catch {
    /* best-effort */
  }
}

function serialize(n: {
  id: bigint;
  module: string | null;
  type: string | null;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}): SerializedAppNotification {
  return {
    id: n.id.toString(),
    module: n.module,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.readAt != null,
    createdAt: n.createdAt.toISOString(),
  };
}

/** Lists a user's notifications (newest first) plus the unread count. */
export async function listAppNotifications(
  userId: bigint,
  opts?: { limit?: number; unreadOnly?: boolean },
): Promise<{ items: SerializedAppNotification[]; unreadCount: number }> {
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 30));
  const [rows, unreadCount] = await Promise.all([
    prisma.appNotification.findMany({
      where: { userId, ...(opts?.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.appNotification.count({ where: { userId, readAt: null } }),
  ]);
  return { items: rows.map(serialize), unreadCount };
}

/** Marks a single notification read (scoped to the owner). */
export async function markAppNotificationRead(userId: bigint, id: bigint): Promise<void> {
  await prisma.appNotification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Marks all of a user's notifications read. */
export async function markAllAppNotificationsRead(userId: bigint): Promise<number> {
  const res = await prisma.appNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}
