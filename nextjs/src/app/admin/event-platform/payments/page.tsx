import { redirect } from "next/navigation";

import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

export default function EventPlatformPaymentsRedirectPage() {
  redirect(EVENT_PLATFORM_PATHS.settings);
}
