import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import AccountCustomerView from "@/components/account/account-customer-view";
import { Button } from "@/components/ui/button";
import { hasAccountPermission, safeJsonParse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { type: string | null; createdBy: bigint | null; id: bigint }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

export default async function AccountCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const { id } = await params;
  if (!/^\d+$/.test(id)) redirect("/account/customers");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  if (!hasAccountPermission(permissions, "manage-customers")) {
    redirect("/account/customers");
  }

  const actorEmail = normalizeEmail(email);
  if (!actorEmail) redirect("/login");

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) redirect("/login");

  const companyId = getCompanyId(actor);
  const pk = BigInt(id);
  const row = await prisma.customer.findFirst({
    where: { id: pk, createdBy: companyId },
    select: { companyName: true, contactPersonName: true, customerCode: true },
  });
  if (!row) redirect("/account/customers");

  const displayTitle =
    row.contactPersonName?.trim() || row.companyName?.trim() || `${t("Customer")} #${id}`;

  const pageActions = (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" asChild>
        <Link href="/account/customers">{t("Back")}</Link>
      </Button>
    </div>
  );

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Account Dashboard"), url: "/account" },
        { label: t("Customers"), url: "/account/customers" },
        { label: displayTitle },
      ]}
      pageTitle={displayTitle}
      pageActions={pageActions}
    >
      <AccountCustomerView customerId={id} permissions={permissions} />
    </AuthenticatedLayout>
  );
}
