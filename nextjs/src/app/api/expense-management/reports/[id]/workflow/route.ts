import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest, getRolesFromRequest } from "@/lib/read-user-cookies";
import { loadEmActorFromEmail, resolveEmOrganizationId } from "@/lib/em-tenant";
import { canAccessEmRecord } from "@/lib/em-portal-scope";
import {
  canPerformWorkflowAction,
  getEmWorkflowCapabilities,
  lineStatusForReportStatus,
  normalizeEmReportStatus,
  type EmWorkflowAction,
} from "@/lib/em-expense-workflow";

type Ctx = { params: Promise<{ id: string }> };

function targetStatusForAction(action: EmWorkflowAction): string | null {
  switch (action) {
    case "submit":
      return "submitted";
    case "withdraw":
      return "draft";
    case "supervisor_approve":
      return "supervisor_approved";
    case "supervisor_reject":
      return "rejected";
    case "send_to_billing":
      return "in_billing";
    case "billing_complete":
      return "processed";
    default:
      return null;
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
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
    action?: EmWorkflowAction;
    rejection_note?: string | null;
  };
  const action = body.action;
  if (!action) {
    return NextResponse.json({ ok: false, message: "action is required" }, { status: 400 });
  }

  const nextStatus = targetStatusForAction(action);
  if (!nextStatus) {
    return NextResponse.json({ ok: false, message: "Invalid action" }, { status: 400 });
  }

  const caps = getEmWorkflowCapabilities({
    permissions: perms,
    roles,
    userType: actor.type,
  });
  const isOwn = existing.createdByUserId === actor.id;
  const currentStatus = normalizeEmReportStatus(existing.status);

  if (!canPerformWorkflowAction(action, currentStatus, caps, isOwn)) {
    return NextResponse.json(
      { ok: false, message: "This action is not allowed for the current report status and your role." },
      { status: 403 },
    );
  }

  const lineStatus = lineStatusForReportStatus(nextStatus);
  const rejectionNote =
    action === "supervisor_reject"
      ? (body.rejection_note?.trim() || "Rejected by supervisor")
      : action === "withdraw" || nextStatus === "draft"
        ? null
        : existing.rejectionNote;

  const [updated] = await prisma.$transaction([
    prisma.emExpenseReport.update({
      where: { id: reportId },
      data: {
        status: nextStatus,
        rejectionNote,
      },
    }),
    prisma.emExpenseLine.updateMany({
      where: { reportId, organizationId },
      data: { status: lineStatus },
    }),
  ]);

  const { notifyEmReportWorkflowChange } = await import("@/lib/em-notification-service");
  void notifyEmReportWorkflowChange({
    organizationId,
    reportId,
    reportNumber: updated.reportNumber,
    purpose: updated.purpose,
    action,
    rejectionNote,
    submitterUserId: existing.createdByUserId,
    excludeUserId: actor.id,
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
