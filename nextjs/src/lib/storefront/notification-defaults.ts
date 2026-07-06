import { prisma } from "@/lib/prisma";

/** Day 10 — default storefront notification template keys (email channel). */
export const STOREFRONT_DEFAULT_TEMPLATE_DEFS: { key: string; name: string; subject: string }[] = [
  { key: "customer_welcome", name: "Customer account welcome", subject: "Welcome to {{storeName}}" },
  { key: "customer_password_reset", name: "Password reset", subject: "Reset your password" },
  { key: "order_confirmation", name: "Order confirmation", subject: "Order {{orderNumber}} confirmed" },
  { key: "order_status_update", name: "Order status update", subject: "Update on order {{orderNumber}}" },
  { key: "support_ticket_linked", name: "Support ticket update", subject: "Ticket {{ticketId}} update" },
];

export async function ensureDefaultStorefrontNotificationTemplates(
  organizationId: bigint,
  websiteId: bigint | null,
  actorUserId: bigint | null,
) {
  for (const def of STOREFRONT_DEFAULT_TEMPLATE_DEFS) {
    const existing = await prisma.notificationTemplate.findFirst({
      where: {
        organizationId,
        websiteId: websiteId === null ? null : websiteId,
        key: def.key,
        channel: "email",
      },
    });
    if (existing) continue;
    await prisma.notificationTemplate.create({
      data: {
        organizationId,
        websiteId: websiteId ?? null,
        key: def.key,
        channel: "email",
        name: def.name,
        subject: def.subject,
        body: `<p>Template placeholder for ${def.name}. Edit in Storefronts → Notifications.</p>`,
        status: "active",
        createdById: actorUserId ?? undefined,
        updatedById: actorUserId ?? undefined,
      },
    });
  }
}
