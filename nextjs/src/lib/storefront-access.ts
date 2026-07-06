import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getActivatedPackagesForUser } from "@/lib/addons-server";
import { safeJsonParse } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  STOREFRONT_PERMISSION,
  userCanMutateStorefront,
  userCanViewStorefront,
  userHasStorefrontPermission,
} from "@/lib/storefront-permissions";
import { prisma } from "@/lib/prisma";
import { writeSaasAuditLog } from "@/lib/saas-audit-log";

/** Matches `add_ons.module` for Storefront (lowercased in activated package lists). */
export const STOREFRONT_ADDON_KEY = "storefront";

const ADD_ON_ROW_MODULE = "Storefront";

export async function isStorefrontAddOnGloballyEnabled(): Promise<boolean> {
  const row = await prisma.addOn.findFirst({
    where: { module: ADD_ON_ROW_MODULE },
    select: { isEnable: true },
  });
  return row?.isEnable === true;
}

export function parseActivatedPackagesCookie(value: string | undefined): string[] {
  return safeJsonParse<string[]>(value, []).map((p) => String(p).toLowerCase());
}

export function cookieIndicatesStorefrontActivated(value: string | undefined): boolean {
  return parseActivatedPackagesCookie(value).includes(STOREFRONT_ADDON_KEY);
}

/** @deprecated Prefer `userCanViewStorefront` / `userHasStorefrontPermission` from storefront-permissions. */
export function userCanManageStorefront(permissions: string[]): boolean {
  return userHasStorefrontPermission(permissions, STOREFRONT_PERMISSION.LEGACY_MANAGE);
}

async function serverActivatedPackagesForRequest(req: NextRequest): Promise<string[] | null> {
  const uid = req.cookies.get("pf_user_id")?.value?.trim();
  if (!uid) return null;
  let id: bigint;
  try {
    id = BigInt(uid);
  } catch {
    return null;
  }
  const rolesRaw = req.cookies.get("pf_roles")?.value;
  const roles = safeJsonParse<string[]>(rolesRaw, []);
  const isSuperadmin = roles.includes("superadmin") || roles.includes("super_admin");
  return getActivatedPackagesForUser(id, isSuperadmin);
}

/**
 * Verifies storefront access using DB-backed activation (cookie cannot be trusted alone).
 */
export async function verifyStorefrontActivatedForRequest(req: NextRequest): Promise<boolean> {
  const fromDb = await serverActivatedPackagesForRequest(req);
  const list = fromDb ?? parseActivatedPackagesCookie(req.cookies.get("pf_activated_packages")?.value);
  if (!list.includes(STOREFRONT_ADDON_KEY)) return false;
  return isStorefrontAddOnGloballyEnabled();
}

export type AssertStorefrontApiOptions = {
  /** One or more permissions — user needs any (unless legacy full access). */
  permission?: string | string[];
  /** When true, require at least one write-capable Storefront permission (or legacy full). */
  requireMutation?: boolean;
};

/**
 * Shared API gate: authenticated, add-on active, and Storefront permission(s).
 * Default: `storefront.view` (or legacy `manage-storefront`).
 */
export async function assertStorefrontApiAccess(
  req: NextRequest,
  options?: AssertStorefrontApiOptions,
): Promise<NextResponse | null> {
  const role = req.cookies.get("pf_role")?.value;
  const email = req.cookies.get("pf_email")?.value ?? "";
  const path = req.nextUrl?.pathname ?? "";

  if (!role) {
    await writeSaasAuditLog({
      eventType: "storefront_api_denied",
      module: ADD_ON_ROW_MODULE,
      path,
      metadata: { reason: "not_authenticated" },
    });
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  /** Use async decode so compact permission IDs (impersonation / small cookies) resolve correctly. */
  const perms = await getPermissionsFromRequest(req);

  const requireMutation = options?.requireMutation === true;
  const permOpt = options?.permission;

  if (requireMutation) {
    if (!userCanMutateStorefront(perms)) {
      await writeSaasAuditLog({
        eventType: "storefront_api_denied",
        module: ADD_ON_ROW_MODULE,
        actorEmail: email || null,
        actorRole: role,
        path,
        metadata: { reason: "missing_mutation_permission" },
      });
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
  } else if (permOpt !== undefined) {
    const list = Array.isArray(permOpt) ? permOpt : [permOpt];
    const ok = list.some((p) => userHasStorefrontPermission(perms, p));
    if (!ok) {
      await writeSaasAuditLog({
        eventType: "storefront_api_denied",
        module: ADD_ON_ROW_MODULE,
        actorEmail: email || null,
        actorRole: role,
        path,
        metadata: { reason: "missing_permission", required: list },
      });
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
  } else if (!userCanViewStorefront(perms)) {
    await writeSaasAuditLog({
      eventType: "storefront_api_denied",
      module: ADD_ON_ROW_MODULE,
      actorEmail: email || null,
      actorRole: role,
      path,
      metadata: { reason: "missing_view_permission" },
    });
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const addonOk = await verifyStorefrontActivatedForRequest(req);
  if (!addonOk) {
    await writeSaasAuditLog({
      eventType: "storefront_api_denied",
      module: ADD_ON_ROW_MODULE,
      actorEmail: email || null,
      actorRole: role,
      path,
      metadata: { reason: "addon_disabled_or_not_on_plan" },
    });
    return NextResponse.json({ ok: false, message: "Storefront add-on is not available for this company." }, { status: 403 });
  }

  return null;
}
