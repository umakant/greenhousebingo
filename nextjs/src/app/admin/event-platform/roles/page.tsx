import { redirect } from "next/navigation";

import { requireEventPlatformPageAccess } from "@/lib/event-platform/require-event-platform-page";

export default async function Page() {
  await requireEventPlatformPageAccess("/admin/event-platform/roles", "roles.manage");
  redirect("/user-management/roles");
}
