import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import CompanyEditForm from "@/components/companies/company-edit-form";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");
  if (role !== "superadmin") redirect("/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  const { id } = await params;

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Companies"), url: "/companies" },
        { label: t("Edit") },
      ]}
      pageTitle={t("Edit company")}
    >
      <CompanyEditForm companyId={id} />
    </AuthenticatedLayout>
  );
}

