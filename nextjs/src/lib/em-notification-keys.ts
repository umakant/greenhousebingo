/** Email template names (`email_templates.name`) and company settings toggles. */
export const EM_EMAIL_TEMPLATE = {
  reportSubmitted: "EM Expense Report Submitted",
  reportSupervisorApproved: "EM Expense Report Supervisor Approved",
  reportRejected: "EM Expense Report Rejected",
  reportInBilling: "EM Expense Report In Billing",
  reportProcessed: "EM Expense Report Processed",
  lineApproved: "EM Expense Line Approved",
  lineRejected: "EM Expense Line Rejected",
} as const;

export const EM_EMAIL_SETTING_KEY = {
  reportSubmitted: "EM Expense Report Submitted",
  reportSupervisorApproved: "EM Expense Report Supervisor Approved",
  reportRejected: "EM Expense Report Rejected",
  reportInBilling: "EM Expense Report In Billing",
  reportProcessed: "EM Expense Report Processed",
  lineApproved: "EM Expense Line Approved",
  lineRejected: "EM Expense Line Rejected",
} as const;

export type EmNotificationReferenceType = "expense_report" | "expense_line";
