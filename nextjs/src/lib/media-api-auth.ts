import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export function canReadMediaLibrary(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "manage-media") ||
    hasPermission(perms, "create-media") ||
    hasPermission(perms, "delete-media") ||
    hasPermission(perms, "manage-media-directories") ||
    hasPermission(perms, "create-media-directories")
  );
}

function canWriteMediaLibrary(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return hasPermission(perms, "create-media") || hasPermission(perms, "manage-media");
}

function canDeleteMediaLibrary(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return hasPermission(perms, "delete-media") || hasPermission(perms, "manage-media");
}

function canWriteMediaDirectories(perms: string[]): boolean {
  if (perms.includes("*")) return true;
  return (
    hasPermission(perms, "create-media-directories") ||
    hasPermission(perms, "manage-media") ||
    hasPermission(perms, "manage-media-directories")
  );
}

function hasSessionIdentity(req: NextRequest): boolean {
  const uid = req.cookies.get("pf_user_id")?.value?.trim();
  const email = req.cookies.get("pf_email")?.value?.trim();
  return Boolean(uid || email);
}

/**
 * Resolves actor + tenant company id from session cookies.
 * Prefers `pf_user_id` (set on login/impersonation) over email lookup.
 */
export async function getMediaActorFromRequest(
  req: NextRequest,
): Promise<{ actorId: bigint | null; companyId: bigint | null }> {
  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim();
  if (uidRaw && /^\d+$/.test(uidRaw)) {
    try {
      const user = await loadTenantActorUser(BigInt(uidRaw));
      if (user) {
        return {
          actorId: user.id,
          companyId: resolveTenantOrganizationId(user),
        };
      }
    } catch {
      // fall through to email lookup
    }
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim();
  if (!email) return { actorId: null, companyId: null };

  const user = await prisma.user
    .findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, type: true, createdBy: true },
    })
    .catch(() => null);
  if (!user) return { actorId: null, companyId: null };

  return {
    actorId: user.id,
    companyId: resolveTenantOrganizationId(user),
  };
}

export async function requireMediaRead(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role || !hasSessionIdentity(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canReadMediaLibrary(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function requireMediaWrite(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role || !hasSessionIdentity(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canWriteMediaLibrary(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function requireMediaDelete(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role || !hasSessionIdentity(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canDeleteMediaLibrary(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function requireMediaDirectoryWrite(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role || !hasSessionIdentity(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const perms = await getPermissionsFromRequest(req);
  if (!canWriteMediaDirectories(perms)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}
