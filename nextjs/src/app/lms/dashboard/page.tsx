import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsDashboard } from "@/components/lms/lms-dashboard";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


export default async function LmsDashboardPage() {
  const user = await requireLmsPageAccess("/lms/dashboard", "manage-lms-dashboard", { auditSuccess: true });

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("LMS Dashboard")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Dashboard") },
      ]}
    >
      <LmsDashboard />
    </LmsAuthenticatedShell>
  );
}
