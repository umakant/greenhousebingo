import "server-only";

import { prisma } from "@/lib/prisma";

export type EmActor = {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
  creatorId: bigint | null;
};

/** Company tenant id for expense rows (`organizationId` → `users.id` for company account). */
export function resolveEmOrganizationId(actor: EmActor): bigint {
  const t = (actor.type ?? "").toLowerCase().trim();
  if (t === "company") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

export async function loadEmActorFromEmail(email: string): Promise<EmActor | null> {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  const u = await prisma.user.findFirst({
    where: { email: e },
    select: { id: true, type: true, createdBy: true, creatorId: true },
  });
  return u;
}
