import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  applyEmSubmitterListScope,
  canAccessEmRecord,
  canApproveOrganizationExpenses,
  isEmPortalSubmitter,
} from "@/lib/em-portal-scope";
import { loadEmActorFromEmail, resolveEmOrganizationId } from "@/lib/em-tenant";
import { recalcEmReportTotal } from "@/lib/em-recalc";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-expense-entries") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const lineId = BigInt(id);
  const organizationId = resolveEmOrganizationId(actor);

  const existing = await prisma.emExpenseLine.findFirst({
    where: { id: lineId, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  if (!canAccessEmRecord(actor, perms, existing.createdByUserId)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    report_id?: string | null;
    expense_date?: string;
    category?: string;
    merchant?: string | null;
    amount?: number;
    currency?: string;
    amount_usd?: number | null;
    project_id?: string | null;
    receipt_attached?: boolean;
    billable?: string | null;
    mileage?: number | null;
    rate_per_mile?: number | null;
    internal_note?: string | null;
    additional_info?: string | null;
    department?: string | null;
    status?: string | null;
  };

  const nextStatus =
    body.status === undefined
      ? undefined
      : body.status === null || body.status === ""
        ? null
        : String(body.status).trim().toLowerCase();

  if (
    nextStatus &&
    (nextStatus === "approved" || nextStatus === "paid" || nextStatus === "processed") &&
    !canApproveOrganizationExpenses(actor, perms)
  ) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  let reportId: bigint | null = existing.reportId;
  if (body.report_id !== undefined) {
    if (!body.report_id || body.report_id === "") {
      reportId = null;
    } else if (/^\d+$/.test(body.report_id)) {
      reportId = BigInt(body.report_id);
      const rep = await prisma.emExpenseReport.findFirst({
        where: applyEmSubmitterListScope(
          { id: reportId, organizationId },
          actor,
          perms,
        ),
      });
      if (!rep) {
        return NextResponse.json({ ok: false, message: "Invalid report_id." }, { status: 400 });
      }
    }
  }

  const prevReportId = existing.reportId;
  const prevStatus = (existing.status ?? "").trim().toLowerCase();

  await prisma.emExpenseLine.update({
    where: { id: lineId },
    data: {
      reportId,
      expenseDate: body.expense_date ? new Date(body.expense_date) : undefined,
      category: body.category !== undefined ? body.category : undefined,
      merchant: body.merchant !== undefined ? body.merchant : undefined,
      amount: body.amount !== undefined ? body.amount : undefined,
      currency: body.currency !== undefined ? body.currency : undefined,
      amountUsd: body.amount_usd !== undefined ? body.amount_usd : undefined,
      projectId: body.project_id !== undefined ? body.project_id : undefined,
      receiptAttached: body.receipt_attached !== undefined ? body.receipt_attached : undefined,
      billable: body.billable !== undefined ? body.billable : undefined,
      mileage: body.mileage !== undefined ? body.mileage : undefined,
      ratePerMile: body.rate_per_mile !== undefined ? body.rate_per_mile : undefined,
      internalNote: body.internal_note !== undefined ? body.internal_note : undefined,
      additionalInfo: body.additional_info !== undefined ? body.additional_info : undefined,
      department: body.department !== undefined ? body.department : undefined,
      status: isEmPortalSubmitter(actor)
        ? undefined
        : body.status === undefined
          ? undefined
          : body.status === null || body.status === ""
            ? "draft"
            : body.status,
    },
  });

  const recalcIds = new Set<bigint>();
  if (prevReportId) recalcIds.add(prevReportId);
  if (reportId) recalcIds.add(reportId);
  for (const rid of recalcIds) {
    await recalcEmReportTotal(rid);
  }

  const resolvedStatus =
    isEmPortalSubmitter(actor)
      ? prevStatus
      : nextStatus !== undefined
        ? nextStatus ?? "draft"
        : prevStatus;

  if (
    resolvedStatus &&
    resolvedStatus !== prevStatus &&
    (resolvedStatus === "approved" || resolvedStatus === "rejected")
  ) {
    let reportNumber: string | null = null;
    const rid = reportId ?? existing.reportId;
    if (rid) {
      const rep = await prisma.emExpenseReport.findFirst({
        where: { id: rid, organizationId },
        select: { reportNumber: true },
      });
      reportNumber = rep?.reportNumber ?? null;
    }

    const { notifyEmLineStatusChange } = await import("@/lib/em-notification-service");
    void notifyEmLineStatusChange({
      organizationId,
      lineId,
      status: resolvedStatus,
      submitterUserId: existing.createdByUserId,
      category: existing.category,
      merchant: existing.merchant,
      amount: existing.amount,
      currency: existing.currency,
      expenseDate: existing.expenseDate,
      reportNumber,
      excludeUserId: actor.id,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-expense-entries") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const lineId = BigInt(id);
  const organizationId = resolveEmOrganizationId(actor);

  const existing = await prisma.emExpenseLine.findFirst({
    where: { id: lineId, organizationId },
  });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });
  }
  if (!canAccessEmRecord(actor, perms, existing.createdByUserId)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  await prisma.emExpenseLine.delete({ where: { id: lineId } });
  if (existing.reportId) {
    await recalcEmReportTotal(existing.reportId);
  }

  return NextResponse.json({ ok: true });
}
