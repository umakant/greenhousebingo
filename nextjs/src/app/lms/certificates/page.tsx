import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsEventCertificatesClient } from "@/components/lms/lms-event-certificates-client";
import { t } from "@/lib/admin-t";

export default async function LmsEventCertificatesPage() {
  return (
    <LmsLearnerPageShell
      auditPath="/lms/certificates"
      pageTitle={t("Event Certificates")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/student/dashboard" },
        { label: t("Certificates") },
      ]}
    >
      <LmsEventCertificatesClient />
    </LmsLearnerPageShell>
  );
}
