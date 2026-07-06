import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsInstructorProfileForm } from "@/components/lms/lms-instructor-profile-form";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


export default async function LmsInstructorProfilePage() {
  const user = await requireLmsPageAccess("/lms/instructor/profile", "manage-lms-instructor-profile");

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("My instructor profile")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Instructor home"), url: "/lms/instructor" },
        { label: t("Profile") },
      ]}
    >
      <LmsInstructorProfileForm />
    </LmsAuthenticatedShell>
  );
}
