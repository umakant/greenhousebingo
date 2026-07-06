import "server-only";

import { prisma } from "@/lib/prisma";

export type AuditorSession = {
  inviteId: bigint;
  organizationId: bigint;
  auditId: bigint | null;
  auditorName: string;
  auditorEmail: string | null;
  organizationName: string | null;
};

export async function resolveAuditorToken(token: string): Promise<AuditorSession | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const invite = await prisma.complianceAuditorInvite.findFirst({
    where: { token: trimmed, revokedAt: null },
    include: {
      organization: { select: { id: true, name: true } },
    },
  });
  if (!invite) return null;
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return null;

  const trust = await prisma.complianceTrustCenter.findUnique({
    where: { organizationId: invite.organizationId },
    select: { auditorPortalEnabled: true },
  });
  if (!trust?.auditorPortalEnabled) return null;

  return {
    inviteId: invite.id,
    organizationId: invite.organizationId,
    auditId: invite.auditId,
    auditorName: invite.auditorName,
    auditorEmail: invite.auditorEmail,
    organizationName: invite.organization.name,
  };
}
