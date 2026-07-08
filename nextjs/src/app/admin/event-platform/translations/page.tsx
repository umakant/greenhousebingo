import { redirect } from "next/navigation";

import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

export default function EventPlatformTranslationsRedirectPage() {
  redirect(EVENT_PLATFORM_PATHS.settings);
}
