import { LmsAuthenticatedShell } from "@/components/lms/lms-authenticated-shell";
import { LmsClassesAdminClient } from "@/components/lms/lms-classes-admin-client";
import { requireLmsPageAccess } from "@/lib/require-lms-page";
import { t } from "@/lib/admin-t";


export default async function LmsClassesPage() {
  const user = await requireLmsPageAccess("/lms/classes", "manage-lms-classes");

  return (
    <LmsAuthenticatedShell
      user={user}
      pageTitle={t("Classes")}
      breadcrumbs={[
        { label: t("LMS"), url: "/lms/dashboard" },
        { label: t("Classes") },
      ]}
    >
      <LmsClassesAdminClient />
    </LmsAuthenticatedShell>
  );
}
