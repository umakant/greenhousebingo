import "server-only";

import { prisma } from "@/lib/prisma";

/** Company-tenant setting (`settings.created_by` = company `users.id`). */
export const LMS_ORG_ENABLED_SETTING_KEY = "saas_lms_enabled";

export type TenantActorUser = {
  id: bigint;
  type: string | null;
  createdBy: bigint | null;
};

/**
 * Resolves the organization (company) id for a tenant user — same pattern as storefront.
 */
export function resolveTenantOrganizationId(user: TenantActorUser): bigint | null {
  const t = (user.type ?? "").trim().toLowerCase();
  if (t === "superadmin" || t === "super admin") return null;
  if (t === "company" || t === "company_admin") return user.id;
  if (user.createdBy != null) return user.createdBy;
  return user.id;
}

export async function loadTenantActorUser(userId: bigint): Promise<TenantActorUser | null> {
  const row = await prisma.user.findFirst({
    where: { id: userId },
    select: { id: true, type: true, createdBy: true },
  });
  return row;
}

/**
 * Whether LMS is allowed for this tenant organization.
 * No row (or empty value) means **enabled**: orgs with LMS on the plan see menus/routes until they explicitly opt out in Settings.
 */
export async function readLmsOrgEnabled(organizationId: bigint): Promise<boolean> {
  const row = await prisma.setting.findFirst({
    where: { createdBy: organizationId, key: LMS_ORG_ENABLED_SETTING_KEY },
    select: { value: true },
  });
  if (!row) return true;
  const v = (row.value ?? "").trim().toLowerCase();
  if (!v) return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

async function nextSettingId(): Promise<bigint> {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function writeLmsOrgEnabled(organizationId: bigint, enabled: boolean): Promise<void> {
  const value = enabled ? "1" : "0";
  const existing = await prisma.setting.findFirst({
    where: { createdBy: organizationId, key: LMS_ORG_ENABLED_SETTING_KEY },
    select: { id: true },
  });
  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value, updatedAt: new Date() },
    });
    return;
  }
  await prisma.setting.create({
    data: {
      id: await nextSettingId(),
      key: LMS_ORG_ENABLED_SETTING_KEY,
      value,
      isPublic: true,
      createdBy: organizationId,
      createdAt: new Date(),
    },
  });
}
