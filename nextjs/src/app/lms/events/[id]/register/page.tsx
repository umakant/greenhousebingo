import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsEventRegisterClient } from "@/components/lms/lms-event-register-client";
import { t } from "@/lib/admin-t";

type Props = { params: Promise<{ id: string }> };

export default async function LmsEventRegisterPage({ params }: Props) {
  const { id } = await params;
  return (
    <LmsLearnerPageShell
      auditPath={`/lms/events/${id}/register`}
      pageTitle={t("Register for Event")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/student/dashboard" },
        { label: t("Events"), url: "/lms/events" },
        { label: t("Register") },
      ]}
    >
      <LmsEventRegisterClient eventId={id} />
    </LmsLearnerPageShell>
  );
}
