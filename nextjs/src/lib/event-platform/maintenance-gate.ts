import "server-only";

import { cookies } from "next/headers";

import {
  readEventPlatformMaintenanceSettings,
  type EventPlatformMaintenanceSettings,
} from "@/lib/event-platform/event-platform-settings";

export const EP_MAINT_BYPASS_COOKIE = "ep_maint_bypass";

const LEARNER_EVENT_PATHS = ["/lms/events", "/lms/my-events"];

export async function isEventPlatformMaintenanceBlocked(
  organizationId: bigint,
  path: string,
): Promise<{ blocked: boolean; settings?: EventPlatformMaintenanceSettings }> {
  const settings = await readEventPlatformMaintenanceSettings(organizationId);
  if (!settings.enabled) return { blocked: false };

  const allowedPrefixes = settings.allowedAdminRoutes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowedPrefixes.some((prefix) => path.startsWith(prefix))) {
    return { blocked: false };
  }

  if (!LEARNER_EVENT_PATHS.some((prefix) => path.startsWith(prefix))) {
    return { blocked: false };
  }

  const jar = await cookies();
  if (jar.get(EP_MAINT_BYPASS_COOKIE)?.value === "1") {
    return { blocked: false };
  }

  return { blocked: true, settings };
}

export function maintenanceBypassPathMatches(
  requestedPath: string,
  configuredBypass: string,
): boolean {
  const req = requestedPath.replace(/^\/+|\/+$/g, "");
  const cfg = configuredBypass.replace(/^\/+|\/+$/g, "");
  if (!cfg) return false;
  return req === cfg;
}
