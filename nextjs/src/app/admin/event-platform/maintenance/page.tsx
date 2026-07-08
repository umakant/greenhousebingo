import { redirect } from "next/navigation";

import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

/** Maintenance is configured under Event Platform → Settings → Maintenance. */
export default function EventPlatformMaintenanceRedirectPage() {
  redirect(EVENT_PLATFORM_PATHS.settings);
}
