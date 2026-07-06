import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsStudentOrganizationEventsClient } from "@/components/lms/lms-student-organization-events-client";
import { t } from "@/lib/admin-t";


export default async function LmsStudentOrganizationEventsPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/student/events/organization"
      pageTitle={t("My Organization Events")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Organization Events") },
      ]}
    >
      <LmsStudentOrganizationEventsClient />
    </LmsLearnerPageShell>
  );
}
