import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsEventNotificationsClient } from "@/components/lms/lms-event-notifications-client";
import { t } from "@/lib/admin-t";

export default async function LmsEventNotificationsPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/notifications"
      pageTitle={t("Event Notifications")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/student/dashboard" },
        { label: t("Notifications") },
      ]}
    >
      <LmsEventNotificationsClient />
    </LmsLearnerPageShell>
  );
}
