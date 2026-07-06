import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsStudentFollowingCoursesClient } from "@/components/lms/lms-student-following-courses-client";
import { t } from "@/lib/admin-t";


export default async function LmsStudentFollowingCoursesPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/student/courses/following"
      pageTitle={t("Following Courses")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Following Courses") },
      ]}
    >
      <LmsStudentFollowingCoursesClient />
    </LmsLearnerPageShell>
  );
}
