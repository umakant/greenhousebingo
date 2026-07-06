import { describe, expect, it } from "vitest";

import {
  canPerformWorkflowAction,
  getEmWorkflowCapabilities,
  normalizeEmReportStatus,
  validateReportStatusChange,
} from "./em-expense-workflow";

describe("em-expense-workflow", () => {
  it("normalizes legacy approved status", () => {
    expect(normalizeEmReportStatus("approved")).toBe("supervisor_approved");
  });

  it("employee can submit own draft report", () => {
    const caps = getEmWorkflowCapabilities({
      permissions: ["manage-expense-reports"],
      roles: ["staff"],
      userType: "staff",
    });
    expect(caps.isEmployeeSubmitter).toBe(true);
    expect(canPerformWorkflowAction("submit", "draft", caps, true)).toBe(true);
    expect(canPerformWorkflowAction("supervisor_approve", "submitted", caps, true)).toBe(false);
  });

  it("supervisor can approve submitted reports", () => {
    const caps = getEmWorkflowCapabilities({
      permissions: ["approve-expense-reports", "manage-expense-reports"],
      roles: ["expense-supervisor"],
      userType: "expense-supervisor",
    });
    expect(caps.canSupervise).toBe(true);
    expect(canPerformWorkflowAction("supervisor_approve", "submitted", caps, false)).toBe(true);
    expect(canPerformWorkflowAction("send_to_billing", "supervisor_approved", caps, false)).toBe(false);
  });

  it("billing can advance supervisor-approved reports", () => {
    const caps = getEmWorkflowCapabilities({
      permissions: ["manage-expense-billing", "manage-expense-reports"],
      roles: ["expense-billing"],
      userType: "expense-billing",
    });
    expect(caps.canBilling).toBe(true);
    expect(canPerformWorkflowAction("send_to_billing", "supervisor_approved", caps, false)).toBe(true);
    expect(canPerformWorkflowAction("billing_complete", "in_billing", caps, false)).toBe(true);
  });

  it("blocks employee from skipping to billing", () => {
    const check = validateReportStatusChange({
      permissions: ["manage-expense-reports"],
      roles: ["staff"],
      userType: "staff",
      currentStatus: "draft",
      nextStatus: "in_billing",
      isOwnRecord: true,
    });
    expect(check.ok).toBe(false);
  });
});
