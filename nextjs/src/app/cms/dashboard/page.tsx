import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { decodePermissions } from "@/lib/read-user-cookies";
import { t } from "@/lib/admin-t";


export default async function CmsDashboardPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  // Company admins and above can manage their own CMS dashboard,
  // superadmin can always see everything via the global CMS menu.
  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = JSON.parse(store.get("pf_roles")?.value ?? "[]") as string[];
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = JSON.parse(store.get("pf_activated_packages")?.value ?? "[]") as string[];

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: t("CMS Dashboard") }]}
      pageTitle={t("CMS Dashboard")}
    >
      {/* Placeholder: hook this up to your per-company website stats / quick links */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t("This dashboard will show analytics and quick actions for the company website and other CMS-powered pages.")}
        </p>
      </div>
    </AuthenticatedLayout>
  );
}

