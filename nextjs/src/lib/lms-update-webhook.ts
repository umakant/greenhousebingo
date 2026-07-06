import "server-only";

import type { LmsOrgSettings } from "@/lib/lms-org-settings";

/** Optional outbound hook when LMS settings change (update / integration systems). */
export async function pingLmsUpdateWebhook(settings: LmsOrgSettings): Promise<void> {
  const url = settings.updateWebhookUrl.trim();
  if (!url) return;
  try {
    const appVersion = process.env.npm_package_version ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "paper-flight-dash-lms",
        event: "lms.settings.updated",
        appVersion,
        lastKnownVersion: settings.updateLastVersion || null,
        at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* non-blocking */
  }
}
