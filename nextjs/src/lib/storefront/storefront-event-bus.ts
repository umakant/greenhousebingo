import { writeSaasAuditLog } from "@/lib/saas-audit-log";
import { createStorefrontEventLog } from "@/lib/storefront/services/event-log-service";

/** Day 40 — canonical storefront integration event names. */
export const STOREFRONT_EVENTS = {
  FORM_SUBMITTED: "storefront.form.submitted",
  CUSTOMER_CREATED: "storefront.customer.created",
  ORDER_CREATED: "storefront.order.created",
  ORDER_PAID: "storefront.order.paid",
  TICKET_CREATED: "storefront.ticket.created",
  TICKET_REPLY: "storefront.ticket.reply",
  TICKET_CLOSED: "storefront.ticket.closed",
  POS_SALE_COMPLETED: "integration.pos.sale.completed",
} as const;

export type StorefrontEventName = (typeof STOREFRONT_EVENTS)[keyof typeof STOREFRONT_EVENTS];

export type StorefrontEventPayload = {
  organizationId: bigint;
  websiteId?: bigint | null;
  eventType: string;
  message?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  actorUserId?: bigint | null;
  severity?: string;
};

type Subscriber = (payload: StorefrontEventPayload) => void | Promise<void>;

const subscribers: Subscriber[] = [];

/** Day 40 — register integration subscribers (CRM extensions, analytics hooks, etc.). */
export function subscribeStorefrontEvent(fn: Subscriber): () => void {
  subscribers.push(fn);
  return () => {
    const i = subscribers.indexOf(fn);
    if (i !== -1) subscribers.splice(i, 1);
  };
}

export async function publishStorefrontEvent(input: StorefrontEventPayload): Promise<void> {
  await createStorefrontEventLog({
    organizationId: input.organizationId,
    websiteId: input.websiteId ?? undefined,
    eventType: input.eventType,
    severity: input.severity ?? "info",
    actorUserId: input.actorUserId,
    resourceType: input.resourceType ?? undefined,
    resourceId: input.resourceId ?? undefined,
    message: input.message ?? undefined,
    metadata: input.metadata ?? undefined,
  });

  const mirrorPrefixes = ["storefront.form.", "storefront.customer.", "storefront.order.", "storefront.ticket.", "integration."];
  if (mirrorPrefixes.some((p) => input.eventType.startsWith(p))) {
    await writeSaasAuditLog({
      eventType: "storefront_event",
      module: "Storefront",
      path: null,
      actorEmail: null,
      actorRole: null,
      metadata: {
        storefrontEvent: input.eventType,
        organizationId: input.organizationId.toString(),
        websiteId: input.websiteId != null ? input.websiteId.toString() : null,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        ...input.metadata,
      },
    });
  }

  for (const fn of [...subscribers]) {
    try {
      await fn(input);
    } catch (e) {
      console.warn("[storefront-event-bus] subscriber failed:", input.eventType, e);
    }
  }
}
