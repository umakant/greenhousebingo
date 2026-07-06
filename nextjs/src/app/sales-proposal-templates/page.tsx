import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { SalesProposalTemplatesAdmin } from "@/components/sales-proposals/sales-proposal-templates-admin";
import { hasPermission, safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";

export default async function SalesProposalTemplatesPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  if (
    !permissions.includes("*") &&
    !hasPermission(permissions, "manage-sales-proposals") &&
    !hasPermission(permissions, "view-sales-proposals")
  ) {
    redirect("/dashboard");
  }

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Accounting"), url: "/account" },
        { label: t("Proposal"), url: "/sales-proposals" },
        { label: t("Proposal Template") },
      ]}
      pageTitle={t("Proposal Template")}
    >
      <SalesProposalTemplatesAdmin permissions={permissions} />
    </AuthenticatedLayout>
  );
}
