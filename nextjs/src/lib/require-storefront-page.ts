import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { safeJsonParse } from "@/lib/authz";
import { decodePermissions } from "@/lib/read-user-cookies";
import {
  userMayAccessStorefrontSection,
  userCanViewStorefront,
} from "@/lib/storefront-permissions";
import { writeSaasAuditLog } from "@/lib/saas-audit-log";
import {
  STOREFRONT_ADDON_KEY,
  isStorefrontAddOnGloballyEnabled,
} from "@/lib/storefront-access";

export type StorefrontPageUser = {
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
  activatedPackages: string[];
};

/**
 * Server-side gate for Storefront UI routes. Verifies global add-on, plan activation,
 * `storefront.view` (or legacy `manage-storefront`), then section permission.
 */
export async function requireStorefrontPageAccess(
  pathForAudit: string,
  section: string,
): Promise<StorefrontPageUser> {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) redirect("/login");

  const email = store.get("pf_email")?.value ?? "";
  const name = store.get("pf_name")?.value ?? "User";
  const roles = safeJsonParse<string[]>(store.get("pf_roles")?.value, []);
  const permissions = await decodePermissions(store.get("pf_permissions")?.value);

  const uidRaw = store.get("pf_user_id")?.value?.trim();
  let activated = safeJsonParse<string[]>(store.get("pf_activated_packages")?.value, []).map((p) =>
    String(p).toLowerCase(),
  );
  if (uidRaw) {
    try {
      const id = BigInt(uidRaw);
      const isSuper = roles.includes("superadmin") || roles.includes("super_admin");
      activated = (await getActivatedPackagesForUser(id, isSuper)).map((p) => p.toLowerCase());
    } catch {
      /* keep cookie-based list */
    }
  }

  const globalOn = await isStorefrontAddOnGloballyEnabled();
  const hasAddon = globalOn && activated.includes(STOREFRONT_ADDON_KEY);

  if (!hasAddon) {
    await writeSaasAuditLog({
      eventType: "storefront_access_denied",
      module: "Storefront",
      actorEmail: email || null,
      actorRole: role,
      path: pathForAudit,
      metadata: { reason: "addon_disabled_or_not_on_plan" },
    });
    redirect("/dashboard");
  }

  if (!userCanViewStorefront(permissions)) {
    await writeSaasAuditLog({
      eventType: "storefront_access_denied",
      module: "Storefront",
      actorEmail: email || null,
      actorRole: role,
      path: pathForAudit,
      metadata: { reason: "missing_view_permission" },
    });
    redirect("/dashboard");
  }

  if (!userMayAccessStorefrontSection(permissions, section)) {
    await writeSaasAuditLog({
      eventType: "storefront_access_denied",
      module: "Storefront",
      actorEmail: email || null,
      actorRole: role,
      path: pathForAudit,
      metadata: { reason: "missing_section_permission", section },
    });
    redirect("/storefront/overview");
  }

  return { name, email, roles, permissions, activatedPackages: activated };
}
