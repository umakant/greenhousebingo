import "server-only";

import { cookies } from "next/headers";

import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";

export type EventPlatformTenantContext = {
  userId: bigint;
  organizationId: bigint;
};

/** Resolves tenant organization from session cookies. Redirects should happen in page guards. */
export async function resolveEventPlatformTenantFromCookies(): Promise<EventPlatformTenantContext | null> {
  const store = await cookies();
  const uidRaw = store.get("pf_user_id")?.value?.trim();
  if (!uidRaw) return null;
  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return null;
  }
  const actor = await loadTenantActorUser(userId);
  if (!actor) return null;
  const organizationId = resolveTenantOrganizationId(actor);
  if (organizationId == null) return null;
  return { userId, organizationId };
}
