import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsMeetingsAdminClient } from "@/components/lms/lms-meetings-admin-client";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


export default async function LmsMeetingsPage() {
  const user = await requireLmsPageAccess("/lms/meetings", "manage-lms-meetings");

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Meetings")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Meetings") },
      ]}
    >
      <LmsMeetingsAdminClient />
    </LmsAuthenticatedShell>
  );
}
