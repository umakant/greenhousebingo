import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsStudentMeetingPackagesClient } from "@/components/lms/lms-student-meeting-packages-client";
import { t } from "@/lib/admin-t";


export default async function LmsStudentMeetingPackagesPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/student/meetings/packages"
      pageTitle={t("Purchased Meeting Packages")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Purchased Meeting Packages") },
      ]}
    >
      <LmsStudentMeetingPackagesClient />
    </LmsLearnerPageShell>
  );
}
