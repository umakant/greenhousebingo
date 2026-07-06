import { createStorefrontEventLog } from "@/lib/storefront/services/event-log-service";
import { writeSaasAuditLog } from "@/lib/saas-audit-log";

/** Day 7 — auditable storefront actions (also mirrored to `saas_audit_logs` with module Storefront). */
export const STOREFRONT_AUDIT_EVENTS = {
  WEBSITE_CREATE: "storefront.website.create",
  WEBSITE_UPDATE: "storefront.website.update",
  WEBSITE_DELETE: "storefront.website.delete",
  DOMAIN_ATTACH: "storefront.domain.attach",
  DOMAIN_UPDATE: "storefront.domain.update",
  DOMAIN_REMOVE: "storefront.domain.remove",
  THEME_CREATE: "storefront.theme.create",
  THEME_UPDATE: "storefront.theme.update",
  THEME_ACTIVATE: "storefront.theme.activate",
  THEME_DISABLE: "storefront.theme.disable",
  THEME_DELETE: "storefront.theme.delete",
  PAGE_CREATE: "storefront.page.create",
  PAGE_UPDATE: "storefront.page.update",
  PAGE_PUBLISH: "storefront.page.publish",
  PAGE_UNPUBLISH: "storefront.page.unpublish",
  PAGE_ROLLBACK: "storefront.page.rollback",
  BLOG_POST_CREATE: "storefront.blog_post.create",
  BLOG_POST_UPDATE: "storefront.blog_post.update",
  BLOG_POST_PUBLISH: "storefront.blog_post.publish",
  BLOG_POST_DELETE: "storefront.blog_post.delete",
  NAVIGATION_UPDATE: "storefront.navigation.update",
  PRODUCT_PUBLISH: "storefront.product.publish",
  PRODUCT_UNPUBLISH: "storefront.product.unpublish",
  PRODUCT_DELETE: "storefront.product.delete",
  DISCOUNT_UPSERT: "storefront.discount.upsert",
  SHIPPING_SETTINGS: "storefront.shipping.settings",
  TAX_SETTINGS: "storefront.tax.settings",
  ORDER_STATUS: "storefront.order.status",
  SETTINGS_UPDATE: "storefront.settings.update",
  NOTIFICATION_SEND: "storefront.notification.send",
} as const;

export type StorefrontAuditEventType = (typeof STOREFRONT_AUDIT_EVENTS)[keyof typeof STOREFRONT_AUDIT_EVENTS];

export async function logStorefrontAudit(opts: {
  organizationId: bigint;
  websiteId?: bigint | null;
  eventType: StorefrontAuditEventType | string;
  actorUserId?: bigint | null;
  resourceType?: string | null;
  resourceId?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  severity?: "info" | "warning" | "error";
  /** Optional SaaS audit row context (staff session). */
  saas?: { actorEmail?: string | null; actorRole?: string | null; path?: string | null };
}): Promise<void> {
  await createStorefrontEventLog({
    organizationId: opts.organizationId,
    websiteId: opts.websiteId ?? undefined,
    eventType: opts.eventType,
    severity: opts.severity ?? "info",
    actorUserId: opts.actorUserId ?? undefined,
    resourceType: opts.resourceType ?? undefined,
    resourceId: opts.resourceId ?? undefined,
    message: opts.message ?? undefined,
    metadata: opts.metadata ?? undefined,
  });

  await writeSaasAuditLog({
    eventType: "storefront_event",
    module: "Storefront",
    path: opts.saas?.path ?? null,
    actorEmail: opts.saas?.actorEmail ?? null,
    actorRole: opts.saas?.actorRole ?? null,
    metadata: {
      storefrontEvent: opts.eventType,
      organizationId: opts.organizationId.toString(),
      websiteId: opts.websiteId != null ? opts.websiteId.toString() : null,
      resourceType: opts.resourceType,
      resourceId: opts.resourceId,
      ...opts.metadata,
    },
  });
}
