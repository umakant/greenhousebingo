import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CompanyWebsiteThemeCustomizer } from "@/components/settings/company-website-theme-customizer";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { hasPermission, isSuperAdminFromRoleCookies, safeJsonParse } from "@/lib/authz";
import { companyWebsiteOwnerId } from "@/lib/company-themes/company-website-access";
import { decodePermissions } from "@/lib/read-user-cookies";
import { prisma } from "@/lib/prisma";

export default async function CompanyWebsiteThemeCustomizePage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  if (isSuperAdminFromRoleCookies(store.get("pf_role")?.value, store.get("pf_roles")?.value)) {
    redirect("/settings");
  }

  const userIdRaw = store.get("pf_user_id")?.value;
  if (userIdRaw) {
    try {
      const userId = BigInt(userIdRaw);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, type: true, createdBy: true },
      });
      if (user && !companyWebsiteOwnerId(user)) redirect("/settings");
    } catch {
      redirect("/settings");
    }
  }

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  const canView =
    permissions.includes("*") ||
    hasPermission(permissions, "manage-brand-settings") ||
    hasPermission(permissions, "edit-brand-settings");

  if (!canView) redirect("/settings");

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: "Settings", url: "/settings" },
        { label: "Customize company website theme" },
      ]}
      pageTitle="Customize company website theme"
    >
      <CompanyWebsiteThemeCustomizer />
    </AuthenticatedLayout>
  );
}
