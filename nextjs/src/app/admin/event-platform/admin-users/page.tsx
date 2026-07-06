import { redirect } from "next/navigation";

import { requireEventPlatformPageAccess } from "@/lib/event-platform/require-event-platform-page";

export default async function EventPlatformAdminUsersPage() {
  await requireEventPlatformPageAccess("/admin/event-platform/admin-users", "roles.manage");
  redirect("/user-management/users");
}
