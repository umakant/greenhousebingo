import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsAnalyticsClient } from "@/components/lms/lms-analytics-client";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


export default async function LmsAnalyticsPage() {
  const user = await requireLmsPageAccess("/lms/analytics", "manage-lms-analytics");

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("LMS Analytics")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Analytics") },
      ]}
    >
      <LmsAnalyticsClient />
    </LmsAuthenticatedShell>
  );
}
