import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LaunchpadClient } from "@/components/launchpad/launchpad-client";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { getServerBrandPrimaryHex } from "@/lib/brand-theme-server";
import { safeJsonParse } from "@/lib/authz";
import { canAccessLaunchpad } from "@/lib/launchpad/launchpad-access";
import { computeLaunchpadOverview } from "@/lib/launchpad/launchpad-status-server";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { prisma } from "@/lib/prisma";
import { decodePermissions } from "@/lib/read-user-cookies";

export default async function LaunchpadPage() {
  const store = await cookies();
  const role = store.get("pf_role")?.value?.trim() ?? "";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  if (!roles.length && !role) redirect("/login");

  const uidRaw = store.get("pf_user_id")?.value?.trim();
  if (!uidRaw) redirect("/login");

  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    redirect("/login");
  }

  const permissions = await decodePermissions(store.get("pf_permissions")?.value);
  const actor = await loadTenantActorUser(userId);
  if (!actor) redirect("/login");

  if (!canAccessLaunchpad({ role, roles, userType: actor.type, permissions })) {
    redirect("/dashboard");
  }

  const organizationId = resolveTenantOrganizationId(actor);
  if (organizationId == null) redirect("/dashboard");

  const userRow = await prisma.user.findFirst({
    where: { id: userId },
    select: { emailVerifiedAt: true, email: true },
  });

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";

  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);
  const overview = await computeLaunchpadOverview({
    organizationId,
    userId,
    permissions,
    activatedPackages,
    userEmail: userRow?.email ?? email,
    emailVerified: Boolean(userRow?.emailVerifiedAt),
  });

  const brandPrimaryHex = await getServerBrandPrimaryHex();

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: "Launchpad" }]}
      pageTitle="Launchpad"
    >
      <LaunchpadClient initialOverview={overview} brandPrimaryHex={brandPrimaryHex ?? undefined} />
    </AuthenticatedLayout>
  );
}
