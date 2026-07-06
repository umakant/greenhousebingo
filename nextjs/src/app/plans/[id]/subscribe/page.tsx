import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import SubscribePlanView from "@/components/plans/subscribe-plan-view";
import { hasPermission } from "@/lib/authz";
import { decodePermissions } from '@/lib/read-user-cookies';
import { t } from "@/lib/admin-t";


export default async function PlanSubscribePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get('pf_permissions')?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  if (!hasPermission(permissions, "manage-plans") && !hasPermission(permissions, "view-plans")) {
    redirect("/dashboard");
  }

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Subscription Setting"), url: "/plans" },
        { label: t("Subscribe to Plan") },
      ]}
      pageTitle={t("Subscribe to Plan")}
    >
      <SubscribePlanView />
    </AuthenticatedLayout>
  );
}
