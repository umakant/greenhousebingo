import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import InvoicePreviewClient from "@/components/companies/invoice-preview-client";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { prisma } from "@/lib/prisma";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


export default async function CompanyInvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string; invoiceId: string }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");
  if (role !== "superadmin") redirect("/dashboard");

  const { id, invoiceId } = await params;

  const company = await prisma.user.findFirst({
    where: { id: BigInt(id), type: { in: ["company", "company_admin"] } },
    select: { id: true, name: true },
  });
  if (!company) redirect("/companies");

  const currencyRow = await prisma.setting.findFirst({
    where: { createdBy: company.id, key: "defaultCurrency" },
    select: { value: true },
  });
  const defaultCurrency = currencyRow?.value?.trim() || "USD";

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Companies"), url: "/companies" },
        { label: company.name ?? t("Company"), url: `/companies/${id}` },
        { label: t("Invoice preview") },
      ]}
      pageTitle={t("Invoice preview")}
    >
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{t("Loading...")}</div>}>
        <InvoicePreviewClient companyId={id} invoiceId={invoiceId} defaultCurrency={defaultCurrency} />
      </Suspense>
    </AuthenticatedLayout>
  );
}
