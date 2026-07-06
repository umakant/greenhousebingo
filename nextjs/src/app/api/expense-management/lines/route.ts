import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { loadEmActorFromEmail, resolveEmOrganizationId } from "@/lib/em-tenant";
import { applyEmSubmitterListScope, isEmPortalSubmitter } from "@/lib/em-portal-scope";
import { emSubmitterNameForLine, loadEmSubmitterNameByUserId } from "@/lib/em-expense-lines";
import { recalcEmReportTotal } from "@/lib/em-recalc";

export async function GET(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-expense-entries") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl;
  const organizationId = resolveEmOrganizationId(actor);
  const reportIdRaw = (url.searchParams.get("report_id") ?? "").trim();

  let where: {
    organizationId: bigint;
    reportId?: bigint;
    createdByUserId?: bigint;
  } = { organizationId };
  if (reportIdRaw && /^\d+$/.test(reportIdRaw)) {
    where.reportId = BigInt(reportIdRaw);
  }
  where = applyEmSubmitterListScope(where, actor, perms);

  const rows = await prisma.emExpenseLine.findMany({
    where,
    orderBy: { expenseDate: "desc" },
    take: 500,
  });

  const submitterNames = await loadEmSubmitterNameByUserId(rows.map((r) => r.createdByUserId));

  return NextResponse.json({
    ok: true,
    data: rows.map((r) => ({
      id: r.id.toString(),
      reportId: r.reportId?.toString() ?? null,
      expenseDate: r.expenseDate.toISOString().slice(0, 10),
      category: r.category,
      merchant: r.merchant,
      amount: Number(r.amount),
      currency: r.currency,
      amountUsd: r.amountUsd != null ? Number(r.amountUsd) : null,
      projectId: r.projectId,
      receiptAttached: r.receiptAttached,
      billable: r.billable,
      mileage: r.mileage != null ? Number(r.mileage) : null,
      ratePerMile: r.ratePerMile != null ? Number(r.ratePerMile) : null,
      internalNote: r.internalNote,
      additionalInfo: r.additionalInfo,
      department: r.department,
      status: r.status,
      submitterName: emSubmitterNameForLine(r.createdByUserId, submitterNames),
    })),
  });
}

export async function POST(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "manage-expense-entries") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const actor = email ? await loadEmActorFromEmail(email) : null;
  if (!actor) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const organizationId = resolveEmOrganizationId(actor);
  const body = (await req.json().catch(() => ({}))) as {
    report_id?: string | null;
    expense_date: string;
    category: string;
    merchant?: string | null;
    amount: number;
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

  if (!body.expense_date || !body.category || body.amount == null) {
    return NextResponse.json({ ok: false, message: "expense_date, category, and amount are required." }, { status: 400 });
  }

  let reportId: bigint | null = null;
  if (body.report_id && /^\d+$/.test(String(body.report_id))) {
    reportId = BigInt(body.report_id);
    const rep = await prisma.emExpenseReport.findFirst({
      where: applyEmSubmitterListScope({ id: reportId, organizationId }, actor, perms),
    });
    if (!rep) {
      return NextResponse.json({ ok: false, message: "Invalid report_id for this organization." }, { status: 400 });
    }
  }

  const row = await prisma.emExpenseLine.create({
    data: {
      organizationId,
      reportId,
      expenseDate: new Date(body.expense_date),
      category: body.category.trim(),
      merchant: body.merchant?.trim() ?? null,
      amount: body.amount,
      currency: body.currency?.trim() || "USD",
      amountUsd: body.amount_usd ?? null,
      projectId: body.project_id?.trim() ?? null,
      receiptAttached: Boolean(body.receipt_attached),
      billable: body.billable?.trim() ?? null,
      mileage: body.mileage ?? null,
      ratePerMile: body.rate_per_mile ?? null,
      internalNote: body.internal_note?.trim() ?? null,
      additionalInfo: body.additional_info?.trim() ?? null,
      department: body.department?.trim() ?? null,
      status: isEmPortalSubmitter(actor) ? "draft" : body.status?.trim() || "draft",
      createdByUserId: actor.id,
    },
  });

  if (reportId) {
    await recalcEmReportTotal(reportId);
  }

  return NextResponse.json({
    ok: true,
    data: { id: row.id.toString() },
  });
}
