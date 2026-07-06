import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsInstructorHomeClient } from "@/components/lms/lms-instructor-home-client";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


export default async function LmsInstructorHomePage() {
  const user = await requireLmsPageAccess("/lms/instructor", "manage-lms-instructor-dashboard", {
    auditSuccess: true,
  });

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Instructor home")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Instructor home") },
      ]}
    >
      <LmsInstructorHomeClient />
    </LmsAuthenticatedShell>
  );
}
