import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { LmsInstructorsAdminClient } from "@/components/lms/lms-instructors-admin-client";
import { requireEventPlatformPageAccessAny } from "@/lib/event-platform/require-event-platform-page";
import { t } from "@/lib/admin-t";

export default async function EventPlatformInstructorsPage() {
  const user = await requireEventPlatformPageAccessAny("/admin/event-platform/instructors", [
    "manage-lms-instructors",
    "manage-lms-events",
  ]);

  return (
    <AuthenticatedLayout
      user={user}
      pageTitle={t("Instructors")}
      breadcrumbs={[
        { label: t("Event Platform"), url: "/admin/event-platform" },
        { label: t("Instructors") },
      ]}
    >
      <LmsInstructorsAdminClient permissions={user.permissions} />
    </AuthenticatedLayout>
  );
}
