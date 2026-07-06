import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { SuperAdminDashboard } from "@/components/superadmin-dashboard";
import { ProjectDashboard } from "@/components/project-dashboard";
import { getSuperadminDashboardData } from "@/lib/superadmin-dashboard-data";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from '@/lib/read-user-cookies';

export default async function DashboardPage() {
  const store = await cookies();
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  if (!roles?.length) {
    redirect("/login");
  }

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  const isSuperAdmin = roles.includes("superadmin") || roles.includes("super_admin");
  if (isSuperAdmin) {
    const data = await getSuperadminDashboardData();

    return (
      <AuthenticatedLayout
        user={{ name, email, roles, permissions, activatedPackages }}
        breadcrumbs={[{ label: "Dashboard" }]}
        pageTitle="Dashboard"
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

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: "Dashboard" }]}
      pageTitle="Project Dashboard"
    >
      <ProjectDashboard />
    </AuthenticatedLayout>
  );
}

