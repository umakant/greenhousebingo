import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CommandCenterClient } from "@/components/launchpad/command-center-client";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import { safeJsonParse } from "@/lib/authz";
import { canAccessLaunchpad } from "@/lib/launchpad/launchpad-access";
import {
  commandCenterFirstName,
  commandCenterGreeting,
  loadCommandCenterPayload,
} from "@/lib/launchpad/command-center-data";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { decodePermissions } from "@/lib/read-user-cookies";

export default async function CommandCenterPage() {
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

  const name = store.get("pf_name")?.value ?? "User";
  const email = store.get("pf_email")?.value ?? "";
  const activatedPackages = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []);

  const data = await loadCommandCenterPayload({
    organizationId,
    permissions,
    activatedPackages,
  });

  const greeting = commandCenterGreeting(commandCenterFirstName(name));

  return (
    <AuthenticatedLayout
      user={{ name, email, roles, permissions, activatedPackages }}
      breadcrumbs={[{ label: "Command Center" }]}
    >
      <CommandCenterClient
        greeting={greeting}
        data={data}
        menuUser={{
          roles,
          permissions,
          activatedPackages,
          primaryRole: role,
        }}
      />
    </AuthenticatedLayout>
  );
}
