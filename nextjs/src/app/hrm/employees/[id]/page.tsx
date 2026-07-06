import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import HrmEmployeeView from "@/components/hrm/hrm-employee-view";
import { HrmEmployeeViewPageActions } from "@/components/hrm/hrm-employee-view-actions";
import { hasPermission, safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/admin-t";


function canViewEmployees(perms: string[]) {
  return (
    hasPermission(perms, "manage-hrm") ||
    hasPermission(perms, "manage-employees") ||
    hasPermission(perms, "view-employees")
  );
}

function canEditEmployee(perms: string[]) {
  return (
    perms.includes("*") ||
    hasPermission(perms, "manage-hrm") ||
    hasPermission(perms, "edit-employees")
  );
}

function getCompanyIdFromActor(actor: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return actor.type === "company" ? actor.id : actor.createdBy ?? actor.id;
}

export default async function HrmEmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  if (!canViewEmployees(permissions)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  const actorEmail = email.trim().toLowerCase();
  if (!actorEmail) redirect("/login");

  const actor = await prisma.user.findFirst({
    where: { email: actorEmail },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor) redirect("/login");

  const companyId = getCompanyIdFromActor(actor);
  const empRow = await prisma.hrmEmployee.findFirst({
    where: { id: BigInt(id), createdBy: companyId },
    select: { firstName: true, lastName: true },
  });
  if (!empRow) redirect("/hrm/employees");

  const pageTitle = `${empRow.firstName} ${empRow.lastName ?? ""}`.trim() || t("Employee");
  const canEdit = canEditEmployee(permissions);

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("HRM Dashboard"), url: "/hrm" },
        { label: t("Employees"), url: "/hrm/employees" },
        { label: t("View") },
      ]}
      pageTitle={pageTitle}
      pageActions={<HrmEmployeeViewPageActions employeeId={id} canEdit={canEdit} />}
    >
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">{t("Loading...")}</div>}>
        <HrmEmployeeView employeeId={id} permissions={permissions} />
      </Suspense>
    </AuthenticatedLayout>
  );
}
