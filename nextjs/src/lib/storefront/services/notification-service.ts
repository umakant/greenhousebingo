import { prisma } from "@/lib/prisma";

export async function listNotificationTemplatesForOrg(
  organizationId: bigint,
  websiteId?: bigint,
) {
  return prisma.notificationTemplate.findMany({
    where: {
      organizationId,
      ...(websiteId != null ? { websiteId } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      websiteId: true,
      key: true,
      channel: true,
      name: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function listRecentNotificationLogs(
  organizationId: bigint,
  opts?: { websiteId?: bigint; take?: number },
) {
  const take = opts?.take ?? 50;
  return prisma.notificationLog.findMany({
    where: {
      organizationId,
      ...(opts?.websiteId != null ? { websiteId: opts.websiteId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      websiteId: true,
      templateId: true,
      channel: true,
      recipient: true,
      status: true,
      sentAt: true,
      createdAt: true,
    },
  });
}
