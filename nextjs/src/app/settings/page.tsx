import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import SettingsPage from "@/components/settings/settings-page";
import { isSuperAdminFromRoleCookies, safeJsonParse } from "@/lib/authz";
import { getSettingsPageDataForUserEmail } from "@/lib/settings-page-data";
import { decodePermissions } from '@/lib/read-user-cookies';

export default async function SettingsRoute({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; payment?: string }>;
}) {
  const { tab, payment } = await searchParams;
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim() || "http://localhost:3000";
  const isSuperAdmin = isSuperAdminFromRoleCookies(store.get("pf_role")?.value, store.get("pf_roles")?.value);
  const pageData = await getSettingsPageDataForUserEmail(email, appUrl, { isSuperAdmin });

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: "Settings" }]}
      pageTitle="Settings"
    >
      <SettingsPage
        isSuperAdmin={isSuperAdmin}
        user={{ name, email, roles, permissions, activatedPackages }}
        pageData={pageData}
        initialTab={tab}
        initialPaymentSubTab={payment}
      />
    </AuthenticatedLayout>
  );
}

