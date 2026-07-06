import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsStudentsAdminClient } from "@/components/lms/lms-students-admin-client";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


export default async function LmsStudentsPage() {
  const user = await requireLmsPageAccess("/lms/students", "manage-lms-students");

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Students")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Students") },
      ]}
    >
      <LmsStudentsAdminClient permissions={user.permissions} />
    </LmsAuthenticatedShell>
  );
}
