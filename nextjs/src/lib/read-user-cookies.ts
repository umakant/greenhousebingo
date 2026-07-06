/**
 * Server-only helper for reading user cookies in page server components and API routes.
 * Handles both legacy JSON permission format and the compact ID format
 * used by regular and impersonated sessions to stay under the Replit proxy header limit.
 */
import type { NextRequest } from "next/server";
import { warmPermissionMap } from "./permission-map";
import { prisma } from "./prisma";
import { getPermissionsFromCookieValue } from "./authz";

/**
 * Decode the raw pf_permissions cookie value to an array of permission name strings.
 * Supports:
 *  - JSON array of strings: '["manage-account","manage-media"]' or '["*"]'
 *  - Compact comma-separated IDs: "1,2,143" (compact sessions)
 *
 * For the compact format, the permission map is warmed on demand before decoding.
 * This function is async so it can be awaited in server components and API routes.
 */
export async function decodePermissions(raw: string | undefined): Promise<string[]> {
  if (!raw) return [];

  if (/^[\d][\d,]*$/.test(raw.trim())) {
    await warmPermissionMap(() =>
      prisma.permission.findMany({ select: { id: true, name: true } }),
    );
  }

  return getPermissionsFromCookieValue(raw);
}

/**
 * Read and decode the pf_permissions cookie from an API route request.
 * Handles both JSON and compact ID formats, warming the permission map as needed.
 * Use this in API routes instead of getPermissionsFromCookieValue() to correctly
 * support the compact cookie format used by non-superadmin users.
 */
export async function getPermissionsFromRequest(req: NextRequest): Promise<string[]> {
  return decodePermissions(req.cookies.get("pf_permissions")?.value);
}

/** Role names from `pf_roles` session cookie (JSON array). */
export function getRolesFromRequest(req: NextRequest): string[] {
  const raw = req.cookies.get("pf_roles")?.value?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is string => typeof r === "string");
  } catch {
    return [];
  }
}
