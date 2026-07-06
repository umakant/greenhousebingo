import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { SalesProposalTemplateForm } from "@/components/sales-proposals/sales-proposal-template-form";
import { hasPermission, safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";

type Props = { params: Promise<{ id: string }> };

export default async function EditSalesProposalTemplatePage({ params }: Props) {
  const { id } = await params;
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  if (!permissions.includes("*") && !hasPermission(permissions, "manage-sales-proposals")) {
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
        { label: t("Proposal Template"), url: "/sales-proposal-templates" },
        { label: t("Edit Proposal Template") },
      ]}
      pageTitle={t("Edit Proposal Template")}
    >
      <SalesProposalTemplateForm templateId={id} />
    </AuthenticatedLayout>
  );
}
