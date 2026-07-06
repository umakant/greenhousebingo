import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsStudentPurchasesClient } from "@/components/lms/lms-student-purchases-client";
import { t } from "@/lib/admin-t";


export default async function LmsStudentPurchasesPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/student/courses/purchases"
      pageTitle={t("My purchases")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("My purchases") },
      ]}
    >
      <LmsStudentPurchasesClient />
    </LmsLearnerPageShell>
  );
}
