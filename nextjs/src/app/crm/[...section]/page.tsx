import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { CrmSectionContent } from "@/components/crm/crm-section-content";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


const SECTION_TITLES: Record<string, string> = {
  leads: t("Leads"),
  deals: t("Deals"),
  setup: t("System Setup"),
  "reports/leads": t("Lead Reports"),
  "reports/deals": t("Deal Reports"),
  reports: t("Reports"),
};

export default async function CrmSectionPage({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const { section: segments } = await params;
  const section = segments.join("/");
  const title = SECTION_TITLES[section] ?? segments[segments.length - 1] ?? "CRM";

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
        { label: title },
      ]}
      pageTitle={title}
    >
      <CrmSectionContent section={section} permissions={permissions} />
    </AuthenticatedLayout>
  );
}
