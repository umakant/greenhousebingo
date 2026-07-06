/** Email template names (`email_templates.name`) for the Partnerships module. */
export const PARTNERSHIP_EMAIL_TEMPLATES = {
  PARTNERSHIP_INVITATION: "Partnership Invitation",
  OWNERSHIP_CHANGE_REQUEST: "Ownership Change Request",
  OWNERSHIP_APPROVAL_REQUIRED: "Ownership Approval Required",
  OWNERSHIP_APPROVED: "Ownership Approved",
  OWNERSHIP_REJECTED: "Ownership Rejected",
  OWNERSHIP_TRANSFER_REQUEST: "Ownership Transfer Request",
  OWNERSHIP_TRANSFER_APPROVED: "Ownership Transfer Approved",
  OWNERSHIP_CONFLICT: "Ownership Conflict Notification",
  PARTNER_REMOVED: "Partner Removed",
  NEW_BRAND_CREATED: "New Brand Created",
} as const;

export type PartnershipEmailTemplateName =
  (typeof PARTNERSHIP_EMAIL_TEMPLATES)[keyof typeof PARTNERSHIP_EMAIL_TEMPLATES];
