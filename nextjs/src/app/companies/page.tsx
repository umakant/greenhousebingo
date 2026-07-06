import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import CompaniesAdmin from "@/components/companies/companies-admin";
import CompaniesPageActions from "@/components/companies/companies-page-actions";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


function parseJsonCookie(value: string | undefined, fallback: string): unknown {
  const raw = value ?? fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(fallback);
  }
}

export default async function CompaniesPage({
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");
  if (role !== "superadmin") redirect("/dashboard");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = parseJsonCookie(store.get("pf_roles")?.value, "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = parseJsonCookie(store.get("pf_activated_packages")?.value, "[]") as string[];

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Companies") }]}
      pageTitle={t("Manage Companies")}
      pageActions={<CompaniesPageActions />}
    >
      <CompaniesAdmin />
    </AuthenticatedLayout>
  );
}

