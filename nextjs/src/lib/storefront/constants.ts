/**
 * Storefronts add-on — canonical status / channel values (DB stores string).
 * Keep in sync with Prisma model comments on storefront_* tables.
 */

export const WEBSITE_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  ARCHIVED: "archived",
  SUSPENDED: "suspended",
} as const;

export const DOMAIN_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  ERROR: "error",
  DISABLED: "disabled",
} as const;

export const THEME_TEMPLATE_STATUS = {
  ACTIVE: "active",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived",
} as const;

export const VERSION_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;

export const INSTANCE_STATUS = {
  ACTIVE: "active",
  HIDDEN: "hidden",
  ARCHIVED: "archived",
} as const;

export const NOTIFICATION_CHANNEL = {
  EMAIL: "email",
  SMS: "sms",
  PUSH: "push",
  IN_APP: "in_app",
} as const;

export const NOTIFICATION_LOG_STATUS = {
  QUEUED: "queued",
  SENT: "sent",
  FAILED: "failed",
  BOUNCED: "bounced",
} as const;

export const NOTIFICATION_TEMPLATE_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;

export const EVENT_LOG_SEVERITY = {
  INFO: "info",
  WARNING: "warning",
  ERROR: "error",
} as const;

export const EVENT_LOG_STATUS = {
  RECORDED: "recorded",
  NEEDS_REVIEW: "needs_review",
} as const;
