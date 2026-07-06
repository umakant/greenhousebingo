/**
 * Marketplace (Water Ice Express) email template + toggle keys.
 *
 * `*_TEMPLATE` values match `email_templates.name` rows seeded by
 * `scripts/seed-marketplace-notification-templates.js`.
 * `*_SETTING_KEY` values match `notifications.action` (the company Settings →
 * Email Notification toggle key) — same strings, mirroring Expense Management.
 */
export const MARKETPLACE_EMAIL_TEMPLATE = {
  orderConfirmation: "Marketplace Order Confirmation",
  cityReadyAdmin: "Marketplace City Ready To Schedule",
  deliveryScheduled: "Marketplace Delivery Scheduled",
  deliveryReminder: "Marketplace Delivery Reminder",
} as const;

export const MARKETPLACE_EMAIL_SETTING_KEY = {
  orderConfirmation: "Marketplace Order Confirmation",
  cityReadyAdmin: "Marketplace City Ready To Schedule",
  deliveryScheduled: "Marketplace Delivery Scheduled",
  deliveryReminder: "Marketplace Delivery Reminder",
} as const;

export type MarketplaceEmailTemplate =
  (typeof MARKETPLACE_EMAIL_TEMPLATE)[keyof typeof MARKETPLACE_EMAIL_TEMPLATE];
