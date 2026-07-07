import "server-only";

import { prisma } from "@/lib/prisma";

/** Company-tenant setting (`settings.created_by` = company `users.id`). */
export const EVENT_PLATFORM_ORG_ENABLED_SETTING_KEY = "saas_event_platform_enabled";

/**
 * Whether Event Platform is allowed for this tenant organization.
 * No row (or empty value) means **enabled**: orgs with Event Platform on the plan see
 * menus/routes until a superadmin explicitly turns it off for the company.
 */
export async function readEventPlatformOrgEnabled(organizationId: bigint): Promise<boolean> {
  const row = await prisma.setting.findFirst({
    where: { createdBy: organizationId, key: EVENT_PLATFORM_ORG_ENABLED_SETTING_KEY },
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

export async function writeEventPlatformOrgEnabled(organizationId: bigint, enabled: boolean): Promise<void> {
  const value = enabled ? "1" : "0";
  const existing = await prisma.setting.findFirst({
    where: { createdBy: organizationId, key: EVENT_PLATFORM_ORG_ENABLED_SETTING_KEY },
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
      key: EVENT_PLATFORM_ORG_ENABLED_SETTING_KEY,
      value,
      isPublic: true,
      createdBy: organizationId,
      createdAt: new Date(),
    },
  });
}
