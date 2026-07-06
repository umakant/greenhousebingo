import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import AuthenticatedLayout from "@/layouts/authenticated-layout";
import ProfileEditClient from "@/components/profile/profile-edit-client";
import { prisma } from "@/lib/prisma";
import { hasPermission, safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import { getTenantBillingPanelData } from "@/lib/settings-page-data";
import { t } from "@/lib/admin-t";


function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export default async function ProfileEditPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const sessionEmail = normalizeEmail(store.get("pf_email")?.value ?? "");
  if (!sessionEmail) redirect("/login");

  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  if (!hasPermission(permissions, "manage-profile")) {
    redirect("/dashboard");
  }

  const userRow = await prisma.user.findFirst({
    where: { email: sessionEmail },
    select: {
      name: true,
      email: true,
      mobileNo: true,
      avatar: true,
      slug: true,
      type: true,
    },
  });

  if (!userRow) redirect("/login");

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  const canEditProfile =
    hasPermission(permissions, "edit-profile") || hasPermission(permissions, "manage-profile");
  const canChangePassword = hasPermission(permissions, "change-password-profile");
  const canManagePlans =
    permissions.includes("*") ||
    hasPermission(permissions, "manage-plans") ||
    hasPermission(permissions, "view-plans");

  const subscriptionBilling = await getTenantBillingPanelData(sessionEmail);

  const initial = {
    name: userRow.name ?? "",
    email: userRow.email ?? "",
    mobileNo: userRow.mobileNo ?? "",
    avatar: userRow.avatar ?? "",
    slug: userRow.slug ?? "",
    type: userRow.type,
  };

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[
        { label: t("Dashboard"), url: "/dashboard" },
        { label: t("Profile") },
        { label: t("Edit") },
      ]}
      pageTitle={t("Profile Settings")}
    >
      <ProfileEditClient
        initial={initial}
        canEditProfile={canEditProfile}
        canChangePassword={canChangePassword}
        subscriptionBilling={subscriptionBilling}
        canManagePlans={canManagePlans}
      />
    </AuthenticatedLayout>
  );
}
