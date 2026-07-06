import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsSettingsAdminClient } from "@/components/lms/lms-settings-admin-client";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


export default async function LmsSettingsPage() {
  const user = await requireLmsPageAccess("/lms/settings", "manage-lms-settings");

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Settings")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Settings") },
      ]}
    >
      <LmsSettingsAdminClient />
    </LmsAuthenticatedShell>
  );
}
