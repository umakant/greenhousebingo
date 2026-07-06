import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";

const CompaniesAdmin = dynamic(() => import("@/components/companies/companies-admin"));

export default async function CompaniesPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/partners");
  if (role !== "superadmin") redirect("/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Companies") }]}
      pageTitle={t("Companies")}
    >
      <CompaniesAdmin />
    </AuthenticatedLayout>
  );
}
