import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import HelpdeskTicketsAdmin from "@/components/helpdesk/helpdesk-tickets-admin";
import { prisma } from "@/lib/prisma";
import { hasPermission, safeJsonParse } from "@/lib/authz";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


export default async function HelpdeskTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  if (!hasPermission(permissions, "manage-helpdesk-tickets") && !permissions.includes("*")) {
    redirect("/dashboard");
  }

  const actor = email
    ? await prisma.user.findFirst({ where: { email: email.trim().toLowerCase() }, select: { id: true, type: true } }).catch(() => null)
    : null;
  const isSuperAdmin = (actor?.type ?? "") === "superadmin" || roles.includes("superadmin") || roles.includes("super_admin") || permissions.includes("*");

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Support Tickets") }]}
      pageTitle={t("Manage Support Tickets")}
      pageActions={null}
    >
      <HelpdeskTicketsAdmin isSuperAdmin={isSuperAdmin} permissions={permissions} />
    </AuthenticatedLayout>
  );
}

