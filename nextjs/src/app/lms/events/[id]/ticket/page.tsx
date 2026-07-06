import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsEventTicketClient } from "@/components/lms/lms-event-ticket-client";
import { t } from "@/lib/admin-t";

type Props = { params: Promise<{ id: string }> };

export default async function LmsEventTicketPage({ params }: Props) {
  const { id } = await params;
  return (
    <LmsLearnerPageShell
      auditPath={`/lms/events/${id}/ticket`}
      pageTitle={t("Event Ticket")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/student/dashboard" },
        { label: t("Events"), url: "/lms/events" },
        { label: t("Ticket") },
      ]}
    >
      <LmsEventTicketClient eventId={id} />
    </LmsLearnerPageShell>
  );
}
