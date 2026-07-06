import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { hasPermission } from "@/lib/authz";
import OrdersAdmin from "@/components/orders/orders-admin";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");
  if (role !== "superadmin") redirect("/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  if (!hasPermission(permissions, "manage-orders")) redirect("/dashboard");

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Orders") }]}
      pageTitle={t("Manage Orders")}
    >
      <OrdersAdmin />
    </AuthenticatedLayout>
  );
}

