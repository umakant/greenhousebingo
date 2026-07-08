import { redirect } from "next/navigation";

import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

export default async function EventPlatformPageEditRedirectPage() {
  redirect(EVENT_PLATFORM_PATHS.settings);
}
