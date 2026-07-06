import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { hasPermission } from "@/lib/authz";
import BankTransferAdmin from "@/components/bank-transfer/bank-transfer-admin";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


export default async function BankTransferPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  if (!hasPermission(permissions, "manage-bank-transfer-requests")) redirect("/dashboard");

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Bank Transfer Requests") }]}
      pageTitle={t("Manage Bank Transfer Requests")}
    >
      <BankTransferAdmin permissions={permissions} />
    </AuthenticatedLayout>
  );
}

