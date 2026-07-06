import "server-only";

import { prisma } from "@/lib/prisma";
import { nextPartnerCommissionId, resolveMarketplaceCommissionRule } from "@/lib/partner-service";

/** Stable order-ref prefix so marketplace commissions never collide with subscription orderRefs. */
export const MARKETPLACE_COMMISSION_ORDER_REF_PREFIX = "mp:";

export type FinalizeMarketplaceCommissionInput = {
  /** The buying company's organization user id (users.id). */
  companyUserId: bigint;
  /** Marketplace order id (MarketplaceOrder.id). */
  marketplaceOrderId: bigint;
  /** Human order number (e.g. MP-20260605-1234) used to build the idempotency orderRef. */
  orderNumber: string;
  /** The paid order total the commission is calculated from. */
  amount: number;
  /** Optional partner already stamped on the order; falls back to the company's partnerId. */
  partnerId?: bigint | null;
};

/**
 * Create a pending MARKETPLACE partner commission for a paid marketplace order.
 *
 * Kept completely separate from subscription commissions:
 * - writes `sourceType: "marketplace"` + `marketplaceOrderId`
 * - uses an `mp:`-prefixed `orderRef` for idempotency (won't clash with subscription orderRefs)
 * - never touches `finalizePartnerCommissionForOrder` or its callers
 *
 * Commission is OPTIONAL: if no per-partner rule and no platform marketplace default is set
 * (type "none" / value 0), nothing is created. Only call this for PAID orders.
 *
 * Designed to be wrapped in try/catch by callers so it never breaks checkout.
 */
export async function finalizePartnerMarketplaceCommission(
  input: FinalizeMarketplaceCommissionInput,
): Promise<void> {
  const { companyUserId, marketplaceOrderId, orderNumber, amount } = input;
  if (!orderNumber || !(amount > 0)) return;

  // Resolve the attributed partner (prefer the partner stamped on the order).
  let partnerId = input.partnerId ?? null;
  if (partnerId == null) {
    const company = await prisma.user.findFirst({
      where: { id: companyUserId },
      select: { partnerId: true },
    });
    partnerId = company?.partnerId ?? null;
  }
  if (partnerId == null) return;

  const orderRef = `${MARKETPLACE_COMMISSION_ORDER_REF_PREFIX}${orderNumber}`;

  // Idempotency: skip if a commission already exists for this marketplace order reference.
  const existing = await prisma.partnerCommission.findFirst({
    where: { orderRef },
    select: { id: true },
  });
  if (existing) return;

  const partner = await prisma.partner.findFirst({
    where: { id: partnerId },
    select: {
      id: true,
      status: true,
      marketplaceCommissionType: true,
      marketplaceCommissionValue: true,
    },
  });
  if (!partner) return;

  const rule = await resolveMarketplaceCommissionRule(partner);
  if (rule.type === "none" || !(rule.value > 0)) return; // optional → off

  // Percentage applies to the order total; flat is a fixed amount per order (capped at the order total).
  let commissionRate = 0;
  let commissionAmount = 0;
  if (rule.type === "percentage") {
    commissionRate = rule.value;
    commissionAmount = Math.round(amount * rule.value) / 100;
  } else {
    commissionRate = 0; // flat — rate not applicable
    commissionAmount = Math.min(rule.value, amount);
  }
  commissionAmount = Math.round(commissionAmount * 100) / 100;
  if (!(commissionAmount > 0)) return;

  try {
    await prisma.partnerCommission.create({
      data: {
        id: await nextPartnerCommissionId(),
        partnerId,
        companyId: companyUserId,
        sourceType: "marketplace",
        marketplaceOrderId,
        subscriptionId: null,
        invoiceId: null,
        orderRef,
        amount,
        commissionRate,
        commissionAmount,
        status: "pending",
        createdAt: new Date(),
      },
    });
  } catch (err) {
    // Unique violation = concurrent create already inserted it — safe to ignore.
    const code = (err as { code?: string })?.code;
    if (code !== "P2002") throw err;
    return;
  }

  // Advance the partner referral to active now that the referred company is purchasing.
  await prisma.partnerReferral.updateMany({
    where: { partnerId, companyId: companyUserId, referralStatus: { in: ["pending", "trial"] } },
    data: { referralStatus: "active", updatedAt: new Date() },
  });
}
