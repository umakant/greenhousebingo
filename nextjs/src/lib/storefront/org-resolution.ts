import { prisma } from "@/lib/prisma";

export type StorefrontActorUser = {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
};

/**
 * `organizationId` on storefront rows = company tenant `users.id`.
 * Staff users inherit their employer via `createdBy`.
 */
export function resolveStorefrontOrganizationId(user: StorefrontActorUser): bigint | null {
  const t = (user.type ?? "").trim().toLowerCase();
  if (t === "superadmin" || t === "super admin") return null;
  if (t === "company" || t === "company_admin") return user.id;
  if (user.createdBy != null) return user.createdBy;
  return user.id;
}

export async function loadStorefrontActorUser(userId: bigint): Promise<StorefrontActorUser | null> {
  const row = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, type: true, createdBy: true },
  });
  return row;
}
