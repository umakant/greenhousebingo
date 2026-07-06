import { LmsLearnerPageShell } from "@/components/lms/lms-learner-page-shell";
import { LmsMyEventDetailClient } from "@/components/lms/lms-my-events-client";
import { t } from "@/lib/admin-t";

type Props = { params: Promise<{ id: string }> };

export default async function LmsMyEventDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <LmsLearnerPageShell
      auditPath={`/lms/my-events/${id}`}
      pageTitle={t("My Event")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/student/dashboard" },
        { label: t("My Events"), url: "/lms/my-events" },
        { label: t("Details") },
      ]}
    >
      <LmsMyEventDetailClient eventId={id} />
    </LmsLearnerPageShell>
  );
}
