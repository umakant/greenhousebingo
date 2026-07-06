import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsInstructorsAdminClient } from "@/components/lms/lms-instructors-admin-client";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


export default async function LmsInstructorsPage() {
  const user = await requireLmsPageAccess("/lms/instructors", "manage-lms-instructors");

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Instructors")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Instructors") },
      ]}
    >
      <LmsInstructorsAdminClient permissions={user.permissions} />
    </LmsAuthenticatedShell>
  );
}
