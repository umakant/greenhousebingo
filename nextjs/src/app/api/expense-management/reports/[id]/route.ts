import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest, getRolesFromRequest } from "@/lib/read-user-cookies";
import { loadEmActorFromEmail, resolveEmOrganizationId } from "@/lib/em-tenant";
import { canAccessEmRecord } from "@/lib/em-portal-scope";
import {
  getEmWorkflowCapabilities,
  lineStatusForReportStatus,
  normalizeEmReportStatus,
  validateReportStatusChange,
} from "@/lib/em-expense-workflow";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-expense-reports") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const roles = getRolesFromRequest(req);
  const { id } = await ctx.params;
  const reportId = BigInt(id);
  const organizationId = resolveEmOrganizationId(actor);

  const existing = await prisma.emExpenseReport.findFirst({
    where: { id: reportId, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  if (!canAccessEmRecord(actor, perms, existing.createdByUserId, roles)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    purpose?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    status?: string | null;
    rejection_note?: string | null;
    currency?: string | null;
  };

  const caps = getEmWorkflowCapabilities({ permissions: perms, roles, userType: actor.type });
  const isOwn = existing.createdByUserId === actor.id;
  const currentStatus = normalizeEmReportStatus(existing.status);

  let resolvedStatus: string | undefined;
  if (body.status !== undefined && body.status !== null) {
    const check = validateReportStatusChange({
      permissions: perms,
      roles,
      userType: actor.type,
      currentStatus,
      nextStatus: body.status,
      isOwnRecord: isOwn,
    });
    if (!check.ok) {
      return NextResponse.json({ ok: false, message: check.message }, { status: 403 });
    }
    resolvedStatus = check.status;
  } else if (caps.isEmployeeSubmitter && isOwn) {
    const editable = currentStatus === "draft" || currentStatus === "rejected";
    if (
      !editable &&
      (body.purpose !== undefined || body.date_from !== undefined || body.date_to !== undefined)
    ) {
      return NextResponse.json(
        { ok: false, message: "You can only edit report details while the report is in draft or rejected." },
        { status: 403 },
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.emExpenseReport.update({
      where: { id: reportId },
      data: {
        purpose: body.purpose !== undefined ? body.purpose : undefined,
        dateFrom:
          body.date_from !== undefined
            ? body.date_from
              ? new Date(body.date_from)
              : null
            : undefined,
        dateTo:
          body.date_to !== undefined ? (body.date_to ? new Date(body.date_to) : null) : undefined,
        status: resolvedStatus,
        rejectionNote: body.rejection_note !== undefined ? body.rejection_note : undefined,
        currency: body.currency !== undefined ? body.currency ?? undefined : undefined,
      },
    });
    if (resolvedStatus) {
      await tx.emExpenseLine.updateMany({
        where: { reportId, organizationId },
        data: { status: lineStatusForReportStatus(resolvedStatus) },
      });
    }
    return row;
  });

  return NextResponse.json({
    ok: true,
    data: {
      id: updated.id.toString(),
      reportNumber: updated.reportNumber,
      status: updated.status,
      totalAmount: Number(updated.totalAmount),
    },
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-expense-reports") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const roles = getRolesFromRequest(req);
  const { id } = await ctx.params;
  const reportId = BigInt(id);
  const organizationId = resolveEmOrganizationId(actor);

  const existing = await prisma.emExpenseReport.findFirst({
    where: { id: reportId, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  if (!canAccessEmRecord(actor, perms, existing.createdByUserId, roles)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const status = normalizeEmReportStatus(existing.status);
  const caps = getEmWorkflowCapabilities({ permissions: perms, roles, userType: actor.type });
  if (caps.isEmployeeSubmitter && existing.createdByUserId === actor.id && status !== "draft") {
    return NextResponse.json(
      { ok: false, message: "Only draft reports can be deleted." },
      { status: 403 },
    );
  }

  await prisma.emExpenseReport.delete({ where: { id: reportId } });
  return NextResponse.json({ ok: true });
}
