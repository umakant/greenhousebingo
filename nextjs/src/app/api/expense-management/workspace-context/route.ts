import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  buildWorkspaceContextUpdate,
  canManageEmWorkspace,
  canReadEmWorkspace,
  ensureDefaultExpenseLines,
  ensureDefaultTimeEntries,
  getOrCreateWorkspaceContext,
  prismaTableMissingResponse,
  requireEmWorkspaceContextDelegate,
  resolveEmWorkspaceRequest,
  serializeWorkspaceContext,
} from "@/lib/em-workspace-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    if (!canReadEmWorkspace(perms, role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ctx = await resolveEmWorkspaceRequest(req);
    if (!ctx.ok) return ctx.res;

    const del = requireEmWorkspaceContextDelegate();
    if (!del.ok) return del.response;

    try {
      const row = await getOrCreateWorkspaceContext(ctx.organizationId);
      await ensureDefaultTimeEntries(ctx.organizationId);
      await ensureDefaultExpenseLines(ctx.organizationId);
      return NextResponse.json({ data: serializeWorkspaceContext(row) });
    } catch (e: unknown) {
      return prismaTableMissingResponse(e, "Workspace context table is missing.") ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("[GET /api/expense-management/workspace-context]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    const ctx = await resolveEmWorkspaceRequest(req);
    if (!ctx.ok) return ctx.res;

    if (!canManageEmWorkspace(perms, role, ctx.actor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const del = requireEmWorkspaceContextDelegate();
    if (!del.ok) return del.response;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    try {
      await getOrCreateWorkspaceContext(ctx.organizationId);
      const row = await del.db.update({
        where: { organizationId: ctx.organizationId },
        data: buildWorkspaceContextUpdate(body),
      });
      return NextResponse.json({ data: serializeWorkspaceContext(row) });
    } catch (e: unknown) {
      return prismaTableMissingResponse(e, "Workspace context table is missing.") ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("[PATCH /api/expense-management/workspace-context]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
