import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import {
  readEventPlatformOrgEnabled,
  writeEventPlatformOrgEnabled,
} from "@/lib/event-platform/event-platform-organization";
import { loadTenantActorUser, resolveTenantOrganizationId } from "@/lib/lms-organization";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
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

function isAuthorized(isSuper: boolean, perms: string[]): boolean {
  return (
    isSuper ||
    perms.includes("*") ||
    hasPermission(perms, "settings.manage") ||
    hasPermission(perms, "manage-event-platform")
  );
}

/** Superadmin or tenant user with Event Platform settings permission may read org opt-in state. */
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
  if (!isAuthorized(isSuper, perms)) {
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

  const enabled = await readEventPlatformOrgEnabled(organizationId);
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
  if (!isAuthorized(isSuper, perms)) {
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

  const prev = await readEventPlatformOrgEnabled(organizationId);
  await writeEventPlatformOrgEnabled(organizationId, enabled);

  if (prev !== enabled) {
    await writeSaasAuditLog({
      eventType: "event_platform_org_toggle",
      module: "EventPlatform",
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
