import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { SuperAdminDashboard } from "@/components/superadmin-dashboard";
import { getSuperadminDashboardData } from "@/lib/superadmin-dashboard-data";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


export default async function SuperadminDashboardPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  const data = await getSuperadminDashboardData();

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Dashboard") }]}
      pageTitle={t("Dashboard")}
    >
      <SuperAdminDashboard
        stats={data.stats}
        chartData={data.chartData}
        recentOrders={data.recentOrders}
        recentCompanies={data.recentCompanies}
        openTickets={data.openTickets}
        recentSubscribers={data.recentSubscribers}
      />
    </AuthenticatedLayout>
  );
}
