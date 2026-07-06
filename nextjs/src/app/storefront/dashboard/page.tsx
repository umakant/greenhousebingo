import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { StorefrontDashboard } from "@/components/storefront/storefront-dashboard";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { requireStorefrontPageAccess } from "@/lib/require-storefront-page";
import { t } from "@/lib/admin-t";


export default async function StorefrontDashboardPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const u = await requireStorefrontPageAccess("/storefront/dashboard", "dashboard");

  return (
    <AuthenticatedLayout
      user={{
        name: u.name,
        email: u.email,
        roles: u.roles,
        permissions: u.permissions,
        activatedPackages: u.activatedPackages,
      }}
      breadcrumbs={[{ label: t("Dashboard"), url: "/dashboard" }, { label: t("Altitude Dashboard") }]}
      pageTitle={t("Altitude Dashboard")}
    >
      <StorefrontDashboard />
    </AuthenticatedLayout>
  );
}
