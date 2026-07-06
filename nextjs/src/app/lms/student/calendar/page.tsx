import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsStudentEventsCalendarClient } from "@/components/lms/lms-student-events-calendar-client";
import { t } from "@/lib/admin-t";


export default async function LmsStudentCalendarPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/student/calendar"
      pageTitle={t("Events Calendar")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Events Calendar") },
      ]}
    >
      <LmsStudentEventsCalendarClient />
    </LmsLearnerPageShell>
  );
}
