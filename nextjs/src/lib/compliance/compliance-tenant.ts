import { prisma } from "@/lib/prisma";

export type ComplianceActor = {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
  creatorId: bigint | null;
  email: string | null;
  name: string | null;
};

export function resolveComplianceOrganizationId(actor: ComplianceActor): bigint {
  const t = (actor.type ?? "").toLowerCase().trim();
  if (t === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

export async function loadComplianceActorFromEmail(email: string): Promise<ComplianceActor | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const user = await prisma.user.findFirst({
    where: { email: normalized },
    select: { id: true, type: true, createdBy: true, creatorId: true, email: true, name: true },
  });
  if (!user) return null;
  return {
    id: user.id,
    type: user.type,
    createdBy: user.createdBy,
    creatorId: user.creatorId,
    email: user.email,
    name: user.name,
  };
}
