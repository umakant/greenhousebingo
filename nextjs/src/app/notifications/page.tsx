import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import NotificationsPageClient from "@/components/notifications/notifications-page-client";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value?.trim();
  if (!role) redirect("/login");

  const user = {
    name: store.get("pf_name")?.value ?? "User",
    email: store.get("pf_email")?.value ?? "",
    roles: safeJsonParse<string[]>(store.get("pf_roles")?.value, []),
    permissions: await decodePermissions(store.get("pf_permissions")?.value),
    activatedPackages: safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []),
  };

  return (
    <AuthenticatedLayout
      user={user}
      breadcrumbs={[{ label: t("Notifications") }]}
      pageTitle={t("Notifications")}
    >
      <NotificationsPageClient />
    </AuthenticatedLayout>
  );
}
