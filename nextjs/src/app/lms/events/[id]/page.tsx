import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsEventDetailClient } from "@/components/lms/lms-event-detail-client";
import { t } from "@/lib/admin-t";

type Props = { params: Promise<{ id: string }> };

export default async function LmsEventDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <LmsLearnerPageShell
      auditPath={`/lms/events/${id}`}
      pageTitle={t("Event Details")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/student/dashboard" },
        { label: t("Events"), url: "/lms/events" },
        { label: t("Details") },
      ]}
    >
      <LmsEventDetailClient eventId={id} />
    </LmsLearnerPageShell>
  );
}
