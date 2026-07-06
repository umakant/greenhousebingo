import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Day 45 — queue a notification log row when a matching storefront template exists (channel/email stub).
 */
export async function maybeQueueTicketNotification(opts: {
  organizationId: bigint;
  websiteId?: bigint | null;
  templateKey: string;
  recipientEmail: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const tpl = await prisma.notificationTemplate.findFirst({
    where: {
      organizationId: opts.organizationId,
      key: opts.templateKey,
      status: "active",
    },
    select: { id: true },
  });
  if (!tpl) return;

  await prisma.notificationLog.create({
    data: {
      organizationId: opts.organizationId,
      websiteId: opts.websiteId ?? undefined,
      templateId: tpl.id,
      channel: "email",
      recipient: opts.recipientEmail,
      status: "queued",
      payload: (opts.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
}
