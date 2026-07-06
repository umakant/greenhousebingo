import { prisma } from "@/lib/prisma";

/**
 * Tenant company id for dashboard/messenger: company and company_admin rows are the org root
 * (same rule as account/dashboard and storefront org-resolution).
 */
export function resolveMessengerTenantCompanyId(actor: {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
  creatorId: bigint | null;
}): bigint {
  const t = (actor.type ?? "").trim().toLowerCase();
  if (t === "company" || t === "company_admin") return actor.id;
  return actor.createdBy ?? actor.creatorId ?? actor.id;
}

export function isSuperadminMessengerActor(actor: { type: string | null }): boolean {
  const t = (actor.type ?? "").toLowerCase();
  return t === "superadmin" || t === "super_admin";
}

/** Users linked via storefront (B2B bridge) or accounting CRM customer.userId. */
export async function loadExtraMessengerPeerIds(companyId: bigint): Promise<bigint[]> {
  const [sf, crm] = await Promise.all([
    prisma.storefrontCustomer.findMany({
      where: { organizationId: companyId, linkedUserId: { not: null } },
      select: { linkedUserId: true },
    }),
    prisma.customer.findMany({
      where: { createdBy: companyId, userId: { not: null } },
      select: { userId: true },
    }),
  ]);
  const set = new Set<bigint>();
  for (const r of sf) {
    if (r.linkedUserId != null) set.add(r.linkedUserId);
  }
  for (const r of crm) {
    if (r.userId != null) set.add(r.userId);
  }
  return [...set];
}

export async function isMessengerPeerAllowedForCompanyActor(
  actor: { id: bigint; type: string | null; createdBy: bigint | null; creatorId: bigint | null },
  peerId: bigint,
): Promise<boolean> {
  if (peerId === actor.id) return false;
  const companyId = resolveMessengerTenantCompanyId(actor);
  const extras = await loadExtraMessengerPeerIds(companyId);
  const peer = await prisma.user.findFirst({
    where: {
      id: peerId,
      NOT: { type: { in: ["superadmin", "super_admin"] } },
      OR: [
        { createdBy: companyId },
        { creatorId: companyId },
        ...(extras.length ? [{ id: { in: extras } }] : []),
      ],
    },
    select: { id: true },
  });
  if (peer) return true;

  /** Super admin ↔ company: allow loading/replying when a thread already exists (inbound from admin or prior reply). */
  const sa = await prisma.user.findFirst({
    where: { id: peerId, type: { in: ["superadmin", "super_admin"] } },
    select: { id: true },
  });
  if (!sa) return false;
  const thread = await prisma.message.findFirst({
    where: {
      OR: [
        { fromId: actor.id, toId: peerId, deletedFromSender: false },
        { fromId: peerId, toId: actor.id, deletedFromReceiver: false },
      ],
    },
    select: { id: true },
  });
  return !!thread;
}

export async function isMessengerPeerAllowedForSuperadminActor(
  actor: { id: bigint; type: string | null },
  peerId: bigint,
): Promise<boolean> {
  if (peerId === actor.id) return false;
  const peer = await prisma.user.findFirst({
    where: {
      id: peerId,
      NOT: { type: { in: ["superadmin", "super_admin"] } },
      OR: [{ type: "company" }, { type: "company_admin" }, { createdBy: { not: null } }],
    },
    select: { id: true },
  });
  return !!peer;
}
