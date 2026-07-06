import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { LeadDetail } from "@/components/crm/lead-detail";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


export default async function CrmLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const { id } = await params;

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("CRM Dashboard"), url: "/crm/dashboard" },
        { label: t("Leads"), url: "/crm/leads" },
        { label: t("Lead detail") },
      ]}
      pageTitle={t("Lead detail")}
    >
      <LeadDetail leadId={id} permissions={permissions} />
    </AuthenticatedLayout>
  );
}
