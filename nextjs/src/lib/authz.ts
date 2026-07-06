import type { NextRequest } from "next/server";

import { getPermissionName, isPermissionMapWarmed } from "./permission-map";

export function safeJsonParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse the pf_permissions cookie value into an array of permission name strings.
 *
 * Supports two formats:
 *  - JSON array of strings (legacy): '["manage-account","manage-media"]' or '["*"]'
 *  - Compact comma-separated IDs (new):  "1,2,3,143"  → decoded via permission-map singleton
 *
 * The compact format is used for impersonated sessions to stay within the
 * Replit proxy's response-header size limit (~4 KB total).
 * The map must be warmed before decoding compact IDs (see decodePermissions / getPermissionsFromRequest).
 * Do not import Prisma here — this module is used from client components (e.g. permission checks in the shell).
 */
export function getPermissionsFromCookieValue(raw: string | undefined): string[] {
  if (!raw) return [];

  // Compact format: only digits and commas (e.g. "1,2,43,143")
  if (/^[\d][\d,]*$/.test(raw.trim())) {
    if (!isPermissionMapWarmed()) {
      // Cold map: return [] until something server-side calls warmPermissionMap() (e.g. decodePermissions).
      return [];
    }
    return raw
      .split(",")
      .map((s) => getPermissionName(Number(s.trim())))
      .filter((n): n is string => !!n);
  }

  // Legacy JSON array format
  const parsed = safeJsonParse<unknown>(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x): x is string => typeof x === "string");
}

export function hasPermission(perms: string[], required: string): boolean {
  if (perms.includes("*")) return true;
  return perms.includes(required);
}

/** True if user has the required permission or an Accounting parent permission. */
export function hasAccountPermission(perms: string[], required: string): boolean {
  if (perms.includes("*")) return true;
  return (
    perms.includes(required) ||
    perms.includes("manage-account") ||
    perms.includes("manage-account-dashboard")
  );
}

/** List / create / edit bank transactions (menu uses `manage-bank-transactions`). */
export function hasBankTransactionPermission(perms: string[]): boolean {
  if (perms.includes("*") || perms.includes("manage-bank-transactions")) return true;
  return hasAccountPermission(perms, "manage-bank-accounts");
}

/**
 * Read bank accounts for dropdowns (e.g. when creating transactions with `manage-bank-transactions`
 * but not necessarily full bank-account management).
 */
export function canListBankAccountsForTransactions(perms: string[]): boolean {
  return hasBankTransactionPermission(perms);
}

/**
 * True when the active session is the platform superadmin (pf_role / pf_roles),
 * not a company tenant. When impersonating a company, cookies reflect the target — returns false.
 */
export function isSuperAdminFromRoleCookies(pfRole: string | undefined, pfRolesJson: string | undefined): boolean {
  if (pfRole === "superadmin") return true;
  const roles = safeJsonParse<string[]>(pfRolesJson, []);
  return roles.includes("superadmin") || roles.includes("super_admin");
}

export function isSuperAdminSession(req: NextRequest): boolean {
  return isSuperAdminFromRoleCookies(req.cookies.get("pf_role")?.value, req.cookies.get("pf_roles")?.value);
}
