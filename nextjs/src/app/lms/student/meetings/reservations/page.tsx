import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsStudentMeetingReservationsClient } from "@/components/lms/lms-student-meeting-reservations-client";
import { t } from "@/lib/admin-t";


export default async function LmsStudentMeetingReservationsPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/student/meetings/reservations"
      pageTitle={t("Meetings List")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Meetings List") },
      ]}
    >
      <LmsStudentMeetingReservationsClient />
    </LmsLearnerPageShell>
  );
}
