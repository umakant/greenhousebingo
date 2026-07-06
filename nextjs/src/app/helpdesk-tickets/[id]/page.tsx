import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { prisma } from "@/lib/prisma";
import HelpdeskTicketDetails from "@/components/helpdesk/helpdesk-ticket-details";
import { hasPermission, safeJsonParse } from "@/lib/authz";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


export default async function HelpdeskTicketDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  if (!hasPermission(permissions, "view-helpdesk-tickets") && !permissions.includes("*")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const actor = email
    ? await prisma.user.findFirst({ where: { email: email.trim().toLowerCase() }, select: { id: true, type: true } }).catch(() => null)
    : null;
  const isSuperAdmin = (actor?.type ?? "") === "superadmin" || roles.includes("superadmin") || roles.includes("super_admin") || permissions.includes("*");

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("Support Tickets"), url: "/helpdesk-tickets" }, { label: t("Ticket Details") }]}
      pageTitle={t("Support Ticket")}
      pageActions={null}
    >
      <HelpdeskTicketDetails ticketId={id} actorId={actor?.id ? actor.id.toString() : null} isSuperAdmin={isSuperAdmin} permissions={permissions} />
    </AuthenticatedLayout>
  );
}

