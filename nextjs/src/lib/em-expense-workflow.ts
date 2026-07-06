import { isEmPortalSubmitterType } from "@/lib/em-access";

/**
 * Expense report approval workflow:
 * Employee (draft) → submitted → supervisor_approved → in_billing → processed
 * Rejected reports return to employee for revision.
 */

export const EM_REPORT_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  SUPERVISOR_APPROVED: "supervisor_approved",
  REJECTED: "rejected",
  IN_BILLING: "in_billing",
  PROCESSED: "processed",
  PAID: "paid",
} as const;

export type EmReportStatus = (typeof EM_REPORT_STATUS)[keyof typeof EM_REPORT_STATUS];

/** Legacy rows may still use `approved` — treat as supervisor-approved. */
export function normalizeEmReportStatus(status: string | null | undefined): string {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "approved") return EM_REPORT_STATUS.SUPERVISOR_APPROVED;
  return s || EM_REPORT_STATUS.DRAFT;
}

export const EM_REPORT_STATUS_LIST: EmReportStatus[] = [
  EM_REPORT_STATUS.DRAFT,
  EM_REPORT_STATUS.SUBMITTED,
  EM_REPORT_STATUS.SUPERVISOR_APPROVED,
  EM_REPORT_STATUS.REJECTED,
  EM_REPORT_STATUS.IN_BILLING,
  EM_REPORT_STATUS.PROCESSED,
  EM_REPORT_STATUS.PAID,
];

export const EM_WORKFLOW_PERMISSIONS = {
  APPROVE: "approve-expense-reports",
  BILLING: "manage-expense-billing",
} as const;

export type EmWorkflowAction =
  | "submit"
  | "supervisor_approve"
  | "supervisor_reject"
  | "send_to_billing"
  | "billing_complete"
  | "withdraw";

export function statusLabel(status: string): string {
  const s = normalizeEmReportStatus(status);
  const labels: Record<string, string> = {
    draft: "Draft",
    submitted: "Pending supervisor",
    supervisor_approved: "Approved — pending billing",
    rejected: "Rejected",
    in_billing: "In billing",
    processed: "Processed",
    paid: "Paid",
  };
  return labels[s] ?? s.replace(/_/g, " ");
}

export type EmWorkflowCapabilities = {
  isEmployeeSubmitter: boolean;
  canSupervise: boolean;
  canBilling: boolean;
  isCompanyAdmin: boolean;
};

export function getEmWorkflowCapabilities(opts: {
  permissions: string[];
  roles?: string[];
  userType?: string | null;
}): EmWorkflowCapabilities {
  const perms = opts.permissions;
  const roles = (opts.roles ?? []).map((r) => r.trim().toLowerCase());
  const userType = (opts.userType ?? "").trim().toLowerCase();
  const isCompanyAdmin =
    perms.includes("*") ||
    userType === "company" ||
    userType === "company_admin" ||
    perms.includes("manage-expense-management");

  const canSupervise =
    isCompanyAdmin ||
    perms.includes(EM_WORKFLOW_PERMISSIONS.APPROVE) ||
    roles.includes("expense-supervisor");

  const canBilling =
    isCompanyAdmin ||
    perms.includes(EM_WORKFLOW_PERMISSIONS.BILLING) ||
    roles.includes("expense-billing");

  const isEmployeeSubmitter =
    !isCompanyAdmin &&
    !canSupervise &&
    !canBilling &&
    isEmPortalSubmitterType(userType);

  return { isEmployeeSubmitter, canSupervise, canBilling, isCompanyAdmin };
}

function targetStatusForAction(action: EmWorkflowAction): EmReportStatus | null {
  switch (action) {
    case "submit":
      return EM_REPORT_STATUS.SUBMITTED;
    case "withdraw":
      return EM_REPORT_STATUS.DRAFT;
    case "supervisor_approve":
      return EM_REPORT_STATUS.SUPERVISOR_APPROVED;
    case "supervisor_reject":
      return EM_REPORT_STATUS.REJECTED;
    case "send_to_billing":
      return EM_REPORT_STATUS.IN_BILLING;
    case "billing_complete":
      return EM_REPORT_STATUS.PROCESSED;
    default:
      return null;
  }
}

export function canPerformWorkflowAction(
  action: EmWorkflowAction,
  currentStatus: string,
  caps: EmWorkflowCapabilities,
  isOwnRecord: boolean,
): boolean {
  const from = normalizeEmReportStatus(currentStatus);
  const to = targetStatusForAction(action);
  if (!to) return false;

  if (caps.isCompanyAdmin) {
    return isValidTransition(from, to, "admin");
  }

  switch (action) {
    case "submit":
      return caps.isEmployeeSubmitter && isOwnRecord && (from === EM_REPORT_STATUS.DRAFT || from === EM_REPORT_STATUS.REJECTED);
    case "withdraw":
      return caps.isEmployeeSubmitter && isOwnRecord && from === EM_REPORT_STATUS.SUBMITTED;
    case "supervisor_approve":
    case "supervisor_reject":
      return caps.canSupervise && from === EM_REPORT_STATUS.SUBMITTED;
    case "send_to_billing":
      return caps.canBilling && from === EM_REPORT_STATUS.SUPERVISOR_APPROVED;
    case "billing_complete":
      return caps.canBilling && from === EM_REPORT_STATUS.IN_BILLING;
    default:
      return false;
  }
}

function isValidTransition(from: string, to: string, mode: "admin" | "strict"): boolean {
  if (from === to) return true;
  const edges: Record<string, string[]> = {
    [EM_REPORT_STATUS.DRAFT]: [EM_REPORT_STATUS.SUBMITTED],
    [EM_REPORT_STATUS.SUBMITTED]: [
      EM_REPORT_STATUS.SUPERVISOR_APPROVED,
      EM_REPORT_STATUS.REJECTED,
      EM_REPORT_STATUS.DRAFT,
    ],
    [EM_REPORT_STATUS.REJECTED]: [EM_REPORT_STATUS.DRAFT, EM_REPORT_STATUS.SUBMITTED],
    [EM_REPORT_STATUS.SUPERVISOR_APPROVED]: [EM_REPORT_STATUS.IN_BILLING, EM_REPORT_STATUS.REJECTED],
    [EM_REPORT_STATUS.IN_BILLING]: [EM_REPORT_STATUS.PROCESSED, EM_REPORT_STATUS.PAID],
    [EM_REPORT_STATUS.PROCESSED]: [EM_REPORT_STATUS.PAID],
    [EM_REPORT_STATUS.PAID]: [],
  };
  if (mode === "admin") {
    return EM_REPORT_STATUS_LIST.includes(to as EmReportStatus);
  }
  return (edges[from] ?? []).includes(to);
}

export function validateReportStatusChange(opts: {
  permissions: string[];
  roles?: string[];
  userType?: string | null;
  currentStatus: string;
  nextStatus: string;
  isOwnRecord: boolean;
}): { ok: true; status: string } | { ok: false; message: string } {
  const caps = getEmWorkflowCapabilities(opts);
  const from = normalizeEmReportStatus(opts.currentStatus);
  const to = normalizeEmReportStatus(opts.nextStatus);

  if (from === to) return { ok: true, status: to };

  if (caps.isCompanyAdmin && isValidTransition(from, to, "admin")) {
    return { ok: true, status: to };
  }

  if (caps.isEmployeeSubmitter && opts.isOwnRecord) {
    if (
      (from === EM_REPORT_STATUS.DRAFT || from === EM_REPORT_STATUS.REJECTED) &&
      to === EM_REPORT_STATUS.SUBMITTED
    ) {
      return { ok: true, status: to };
    }
    if (from === EM_REPORT_STATUS.SUBMITTED && to === EM_REPORT_STATUS.DRAFT) {
      return { ok: true, status: to };
    }
    return { ok: false, message: "Employees can submit reports for supervisor approval or withdraw while pending." };
  }

  if (caps.canSupervise && from === EM_REPORT_STATUS.SUBMITTED) {
    if (to === EM_REPORT_STATUS.SUPERVISOR_APPROVED || to === EM_REPORT_STATUS.REJECTED) {
      return { ok: true, status: to };
    }
  }

  if (caps.canBilling) {
    if (from === EM_REPORT_STATUS.SUPERVISOR_APPROVED && to === EM_REPORT_STATUS.IN_BILLING) {
      return { ok: true, status: to };
    }
    if (from === EM_REPORT_STATUS.IN_BILLING && (to === EM_REPORT_STATUS.PROCESSED || to === EM_REPORT_STATUS.PAID)) {
      return { ok: true, status: to };
    }
  }

  return { ok: false, message: "This status change is not allowed for your role." };
}

export function lineStatusForReportStatus(reportStatus: string): string {
  const s = normalizeEmReportStatus(reportStatus);
  if (s === EM_REPORT_STATUS.DRAFT) return EM_REPORT_STATUS.DRAFT;
  if (s === EM_REPORT_STATUS.REJECTED) return EM_REPORT_STATUS.DRAFT;
  return s;
}
