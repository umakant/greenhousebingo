import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsEventsCatalogClient } from "@/components/lms/lms-events-catalog-client";
import { t } from "@/lib/admin-t";

export default async function LmsEventsPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/events"
      pageTitle={t("Browse Events")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/student/dashboard" },
        { label: t("Events") },
      ]}
    >
      <LmsEventsCatalogClient />
    </LmsLearnerPageShell>
  );
}
