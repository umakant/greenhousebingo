import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsStudentMyCommentsClient } from "@/components/lms/lms-student-my-comments-client";
import { t } from "@/lib/admin-t";


export default async function LmsStudentCommentsPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/student/courses/comments"
      pageTitle={t("My comments")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("My comments") },
      ]}
    >
      <LmsStudentMyCommentsClient />
    </LmsLearnerPageShell>
  );
}
