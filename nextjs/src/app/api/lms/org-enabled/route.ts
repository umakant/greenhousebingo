import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  loadTenantActorUser,
  readLmsOrgEnabled,
  resolveTenantOrganizationId,
  writeLmsOrgEnabled,
} from "@/lib/lms-organization";
import { prisma } from "@/lib/prisma";
import { writeSaasAuditLog } from "@/lib/saas-audit-log";

export const dynamic = "force-dynamic";

function parseOrgId(raw: string | null): bigint | null {
  if (!raw?.trim()) return null;
  try {
    return BigInt(raw.trim());
  } catch {
    return null;
  }
}

/** Superadmin or tenant user with `manage-lms-settings` may read LMS org opt-in state. */
export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value?.trim() ?? "";
  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim();
  if (!uidRaw) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  const isSuper = role === "superadmin";
  if (
    !isSuper &&
    !perms.includes("*") &&
    !hasPermission(perms, "manage-lms-settings") &&
    !hasPermission(perms, "manage-lms")
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const actor = await loadTenantActorUser(userId);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let organizationId: bigint | null = null;
  if (isSuper) {
    organizationId = parseOrgId(req.nextUrl.searchParams.get("organizationId"));
    if (organizationId == null) {
      return NextResponse.json(
        { ok: false, message: "organizationId query parameter is required for superadmin." },
        { status: 400 },
      );
    }
  } else {
    organizationId = resolveTenantOrganizationId(actor);
    if (organizationId == null) {
      return NextResponse.json({ ok: false, message: "No organization context." }, { status: 400 });
    }
  }

  const company = await prisma.user.findFirst({
    where: { id: organizationId, type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ ok: false, message: "Organization not found." }, { status: 404 });
  }

  const enabled = await readLmsOrgEnabled(organizationId);
  return NextResponse.json({
    ok: true,
    organizationId: organizationId.toString(),
    enabled,
  });
}

export async function PATCH(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value?.trim() ?? "";
  const uidRaw = req.cookies.get("pf_user_id")?.value?.trim();
  if (!uidRaw) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  const isSuper = role === "superadmin";
  if (
    !isSuper &&
    !perms.includes("*") &&
    !hasPermission(perms, "manage-lms-settings") &&
    !hasPermission(perms, "manage-lms")
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const enabled = typeof body?.enabled === "boolean" ? body.enabled : null;
  if (enabled === null) {
    return NextResponse.json({ ok: false, message: "enabled (boolean) is required." }, { status: 400 });
  }

  const actor = await loadTenantActorUser(userId);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let organizationId: bigint | null = null;
  if (isSuper) {
    const raw = typeof body?.organizationId === "string" ? body.organizationId : null;
    organizationId = parseOrgId(raw);
    if (organizationId == null) {
      return NextResponse.json(
        { ok: false, message: "organizationId (string) is required when acting as superadmin." },
        { status: 400 },
      );
    }
  } else {
    organizationId = resolveTenantOrganizationId(actor);
    if (organizationId == null) {
      return NextResponse.json({ ok: false, message: "No organization context." }, { status: 400 });
    }
  }

  const company = await prisma.user.findFirst({
    where: { id: organizationId, type: { in: ["company", "company_admin"] } },
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ ok: false, message: "Organization not found." }, { status: 404 });
  }

  const prev = await readLmsOrgEnabled(organizationId);
  await writeLmsOrgEnabled(organizationId, enabled);

  if (prev !== enabled) {
    await writeSaasAuditLog({
      eventType: "lms_org_toggle",
      module: "Lms",
      actorEmail: req.cookies.get("pf_email")?.value ?? null,
      actorRole: role || null,
      path: req.nextUrl.pathname,
      metadata: {
        organization_id: organizationId.toString(),
        previous_enabled: prev,
        next_enabled: enabled,
      },
    });
  }

  return NextResponse.json({ ok: true, organizationId: organizationId.toString(), enabled });
}
