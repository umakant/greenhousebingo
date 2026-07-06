import "server-only";

import type { EmWorkflowAction } from "@/lib/em-expense-workflow";
import { normalizeEmReportStatus, statusLabel } from "@/lib/em-expense-workflow";
import {
  EM_EMAIL_SETTING_KEY,
  EM_EMAIL_TEMPLATE,
  type EmNotificationReferenceType,
} from "@/lib/em-notification-keys";
import { prisma } from "@/lib/prisma";
import { LARAVEL_USER_MORPH_TYPE } from "@/lib/laravel-user-model-type";
import { isCompanyEmailNotificationEnabled, sendTemplatedEmailAsync } from "@/lib/send-templated-email";
import { getSettingsForOwner } from "@/lib/settings-service";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");

async function alreadySent(params: {
  organizationId: bigint;
  templateKey: string;
  channel: string;
  referenceType: EmNotificationReferenceType;
  referenceId: bigint;
  userId: bigint | null;
}): Promise<boolean> {
  if (!prisma.emNotificationLog) return false;
  const row = await prisma.emNotificationLog.findFirst({
    where: {
      organizationId: params.organizationId,
      templateKey: params.templateKey,
      channel: params.channel,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      userId: params.userId,
    },
    select: { id: true },
  });
  return Boolean(row);
}

async function markSent(params: {
  organizationId: bigint;
  templateKey: string;
  channel: string;
  referenceType: EmNotificationReferenceType;
  referenceId: bigint;
  userId: bigint | null;
}) {
  if (!prisma.emNotificationLog) return;
  try {
    await prisma.emNotificationLog.create({
      data: {
        organizationId: params.organizationId,
        templateKey: params.templateKey,
        channel: params.channel,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        userId: params.userId,
      },
    });
  } catch {
    /* duplicate */
  }
}

async function usersInOrganizationWithRole(orgId: bigint, roleName: string) {
  const role = await prisma.role.findFirst({
    where: { name: roleName },
    select: { id: true },
  });
  if (!role) return [];

  const links = await prisma.modelHasRole.findMany({
    where: { roleId: role.id, modelType: LARAVEL_USER_MORPH_TYPE },
    select: { modelId: true },
  });
  const ids = links.map((l) => l.modelId);
  if (!ids.length) return [];

  return prisma.user.findMany({
    where: {
      id: { in: ids },
      isActive: true,
      OR: [{ id: orgId }, { createdBy: orgId }, { creatorId: orgId }],
      email: { not: null },
    },
    select: { id: true, name: true, email: true },
  });
}

async function usersWithPermissionInOrg(orgId: bigint, permissionName: string) {
  const perm = await prisma.permission.findFirst({
    where: { name: permissionName },
    select: { id: true },
  });
  if (!perm) return [];

  const roleLinks = await prisma.roleHasPermission.findMany({
    where: { permissionId: perm.id },
    select: { roleId: true },
  });
  const roleIds = [...new Set(roleLinks.map((r) => r.roleId))];
  if (!roleIds.length) return [];

  const modelLinks = await prisma.modelHasRole.findMany({
    where: { roleId: { in: roleIds }, modelType: LARAVEL_USER_MORPH_TYPE },
    select: { modelId: true },
  });
  const ids = [...new Set(modelLinks.map((m) => m.modelId))];
  if (!ids.length) return [];

  return prisma.user.findMany({
    where: {
      id: { in: ids },
      isActive: true,
      OR: [{ id: orgId }, { createdBy: orgId }, { creatorId: orgId }],
      email: { not: null },
    },
    select: { id: true, name: true, email: true },
  });
}

type EmUserRow = { id: bigint; name: string | null; email: string | null };

function dedupeUsers(rows: EmUserRow[]) {
  const seen = new Set<string>();
  return rows.filter((u) => {
    const e = (u.email ?? "").trim().toLowerCase();
    if (!e || seen.has(e)) return false;
    seen.add(e);
    return true;
  });
}

async function loadSupervisorRecipients(organizationId: bigint): Promise<EmUserRow[]> {
  return dedupeUsers([
    ...(await usersInOrganizationWithRole(organizationId, "expense-supervisor")),
    ...(await usersWithPermissionInOrg(organizationId, "approve-expense-reports")),
    ...(await usersWithPermissionInOrg(organizationId, "manage-expense-management")),
  ]);
}

async function dispatchEmail(params: {
  organizationId: bigint;
  userId: bigint | null;
  templateName: string;
  settingKey: string;
  referenceType: EmNotificationReferenceType;
  referenceId: bigint;
  mailTo: string[];
  variables: Record<string, string>;
}) {
  const recipients = [...new Set(params.mailTo.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!recipients.length) return;

  const settings = await getSettingsForOwner(params.organizationId);
  if (!isCompanyEmailNotificationEnabled(settings, params.settingKey)) return;

  const sent = await alreadySent({
    organizationId: params.organizationId,
    templateKey: params.templateName,
    channel: "email",
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    userId: params.userId,
  });
  if (sent) return;

  sendTemplatedEmailAsync({
    templateName: params.templateName,
    mailTo: recipients,
    ownerId: params.organizationId,
    variables: params.variables,
  });

  await markSent({
    organizationId: params.organizationId,
    templateKey: params.templateName,
    channel: "email",
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    userId: params.userId,
  });
}

function formatMoney(amount: number | string | { toString(): string }, currency = "USD"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function formatExpenseDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function appPath(path: string): string {
  return APP_URL ? `${APP_URL}${path}` : path;
}

function reportUrl(): string {
  return appPath("/expense-management/reports");
}

function expensesUrl(): string {
  return appPath("/expense-management/expenses");
}

/** Notify the right parties after a workflow transition (email; idempotent per recipient). */
export async function notifyEmReportWorkflowChange(params: {
  organizationId: bigint;
  reportId: bigint;
  reportNumber: string;
  purpose: string | null;
  action: EmWorkflowAction;
  rejectionNote?: string | null;
  submitterUserId: bigint | null;
  /** Skip emailing this user (e.g. the supervisor who performed the action). */
  excludeUserId?: bigint | null;
}) {
  const submitter =
    params.submitterUserId != null
      ? await prisma.user.findFirst({
          where: { id: params.submitterUserId },
          select: { id: true, name: true, email: true },
        })
      : null;

  const baseVars = {
    report_number: params.reportNumber,
    report_status: statusLabel(
      params.action === "submit"
        ? "submitted"
        : params.action === "supervisor_approve"
          ? "supervisor_approved"
          : params.action === "supervisor_reject"
            ? "rejected"
            : params.action === "send_to_billing"
              ? "in_billing"
              : params.action === "billing_complete"
                ? "processed"
                : "draft",
    ),
    report_purpose: params.purpose?.trim() || "—",
    report_url: reportUrl(),
    rejection_note: params.rejectionNote?.trim() || "—",
    company_name: "-",
  };

  const supervisors = await loadSupervisorRecipients(params.organizationId);
  const billingUsers = dedupeUsers([
    ...(await usersInOrganizationWithRole(params.organizationId, "expense-billing")),
    ...(await usersWithPermissionInOrg(params.organizationId, "manage-expense-billing")),
  ]);

  const skipUser = params.excludeUserId ?? null;

  switch (params.action) {
    case "submit": {
      for (const sup of supervisors) {
        await dispatchEmail({
          organizationId: params.organizationId,
          userId: sup.id,
          templateName: EM_EMAIL_TEMPLATE.reportSubmitted,
          settingKey: EM_EMAIL_SETTING_KEY.reportSubmitted,
          referenceType: "expense_report",
          referenceId: params.reportId,
          mailTo: [sup.email!],
          variables: {
            name: sup.name ?? "Supervisor",
            employee_name: submitter?.name ?? "Employee",
            ...baseVars,
          },
        });
      }
      break;
    }
    case "supervisor_approve": {
      for (const bill of billingUsers) {
        await dispatchEmail({
          organizationId: params.organizationId,
          userId: bill.id,
          templateName: EM_EMAIL_TEMPLATE.reportSupervisorApproved,
          settingKey: EM_EMAIL_SETTING_KEY.reportSupervisorApproved,
          referenceType: "expense_report",
          referenceId: params.reportId,
          mailTo: [bill.email!],
          variables: {
            name: bill.name ?? "Billing",
            employee_name: submitter?.name ?? "Employee",
            ...baseVars,
          },
        });
      }
      for (const sup of supervisors) {
        if (skipUser != null && sup.id === skipUser) continue;
        await dispatchEmail({
          organizationId: params.organizationId,
          userId: sup.id,
          templateName: EM_EMAIL_TEMPLATE.reportSupervisorApproved,
          settingKey: EM_EMAIL_SETTING_KEY.reportSupervisorApproved,
          referenceType: "expense_report",
          referenceId: params.reportId,
          mailTo: [sup.email!],
          variables: {
            name: sup.name ?? "Supervisor",
            employee_name: submitter?.name ?? "Employee",
            ...baseVars,
          },
        });
      }
      if (submitter?.email) {
        await dispatchEmail({
          organizationId: params.organizationId,
          userId: submitter.id,
          templateName: EM_EMAIL_TEMPLATE.reportSupervisorApproved,
          settingKey: EM_EMAIL_SETTING_KEY.reportSupervisorApproved,
          referenceType: "expense_report",
          referenceId: params.reportId,
          mailTo: [submitter.email],
          variables: {
            name: submitter.name ?? "Employee",
            employee_name: submitter.name ?? "Employee",
            ...baseVars,
          },
        });
      }
      break;
    }
    case "supervisor_reject": {
      if (submitter?.email) {
        await dispatchEmail({
          organizationId: params.organizationId,
          userId: submitter.id,
          templateName: EM_EMAIL_TEMPLATE.reportRejected,
          settingKey: EM_EMAIL_SETTING_KEY.reportRejected,
          referenceType: "expense_report",
          referenceId: params.reportId,
          mailTo: [submitter.email],
          variables: {
            name: submitter.name ?? "Employee",
            employee_name: submitter.name ?? "Employee",
            ...baseVars,
          },
        });
      }
      for (const sup of supervisors) {
        if (skipUser != null && sup.id === skipUser) continue;
        await dispatchEmail({
          organizationId: params.organizationId,
          userId: sup.id,
          templateName: EM_EMAIL_TEMPLATE.reportRejected,
          settingKey: EM_EMAIL_SETTING_KEY.reportRejected,
          referenceType: "expense_report",
          referenceId: params.reportId,
          mailTo: [sup.email!],
          variables: {
            name: sup.name ?? "Supervisor",
            employee_name: submitter?.name ?? "Employee",
            ...baseVars,
          },
        });
      }
      break;
    }
    case "send_to_billing": {
      if (submitter?.email) {
        await dispatchEmail({
          organizationId: params.organizationId,
          userId: submitter.id,
          templateName: EM_EMAIL_TEMPLATE.reportInBilling,
          settingKey: EM_EMAIL_SETTING_KEY.reportInBilling,
          referenceType: "expense_report",
          referenceId: params.reportId,
          mailTo: [submitter.email],
          variables: {
            name: submitter.name ?? "Employee",
            employee_name: submitter.name ?? "Employee",
            ...baseVars,
          },
        });
      }
      break;
    }
    case "billing_complete": {
      if (submitter?.email) {
        await dispatchEmail({
          organizationId: params.organizationId,
          userId: submitter.id,
          templateName: EM_EMAIL_TEMPLATE.reportProcessed,
          settingKey: EM_EMAIL_SETTING_KEY.reportProcessed,
          referenceType: "expense_report",
          referenceId: params.reportId,
          mailTo: [submitter.email],
          variables: {
            name: submitter.name ?? "Employee",
            employee_name: submitter.name ?? "Employee",
            ...baseVars,
          },
        });
      }
      break;
    }
    default:
      break;
  }
}

/** Notify employee and supervisors when a matter expense line is approved or rejected. */
export async function notifyEmLineStatusChange(params: {
  organizationId: bigint;
  lineId: bigint;
  status: "approved" | "rejected";
  submitterUserId: bigint | null;
  category: string;
  merchant: string | null;
  amount: number | string | { toString(): string };
  currency: string;
  expenseDate: Date;
  reportNumber?: string | null;
  rejectionNote?: string | null;
  excludeUserId?: bigint | null;
}) {
  const normalized = normalizeEmReportStatus(params.status);
  const isApproved = normalized === "supervisor_approved";
  const isRejected = normalized === "rejected";
  if (!isApproved && !isRejected) return;

  const submitter =
    params.submitterUserId != null
      ? await prisma.user.findFirst({
          where: { id: params.submitterUserId },
          select: { id: true, name: true, email: true },
        })
      : null;

  const supervisors = await loadSupervisorRecipients(params.organizationId);
  const skipUser = params.excludeUserId ?? null;
  const lineStatus = statusLabel(params.status);

  const baseVars = {
    line_category: params.category.trim() || "—",
    line_vendor: params.merchant?.trim() || "—",
    line_amount: formatMoney(params.amount, params.currency),
    line_date: formatExpenseDate(params.expenseDate),
    line_status: lineStatus,
    report_number: params.reportNumber?.trim() || "—",
    expenses_url: expensesUrl(),
    rejection_note: params.rejectionNote?.trim() || "—",
    employee_name: submitter?.name ?? "Employee",
    company_name: "-",
  };

  const templateName = isApproved ? EM_EMAIL_TEMPLATE.lineApproved : EM_EMAIL_TEMPLATE.lineRejected;
  const settingKey = isApproved ? EM_EMAIL_SETTING_KEY.lineApproved : EM_EMAIL_SETTING_KEY.lineRejected;

  if (submitter?.email) {
    await dispatchEmail({
      organizationId: params.organizationId,
      userId: submitter.id,
      templateName,
      settingKey,
      referenceType: "expense_line",
      referenceId: params.lineId,
      mailTo: [submitter.email],
      variables: {
        name: submitter.name ?? "Employee",
        ...baseVars,
      },
    });
  }

  for (const sup of supervisors) {
    if (skipUser != null && sup.id === skipUser) continue;
    await dispatchEmail({
      organizationId: params.organizationId,
      userId: sup.id,
      templateName,
      settingKey,
      referenceType: "expense_line",
      referenceId: params.lineId,
      mailTo: [sup.email!],
      variables: {
        name: sup.name ?? "Supervisor",
        ...baseVars,
      },
    });
  }
}
