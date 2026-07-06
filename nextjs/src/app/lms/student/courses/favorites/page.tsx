import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsStudentFavoritesClient } from "@/components/lms/lms-student-favorites-client";
import { t } from "@/lib/admin-t";


export default async function LmsStudentFavoritesPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/student/courses/favorites"
      pageTitle={t("Favorites")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Favorites") },
      ]}
    >
      <LmsStudentFavoritesClient />
    </LmsLearnerPageShell>
  );
}
