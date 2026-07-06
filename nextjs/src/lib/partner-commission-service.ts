import "server-only";

import { prisma } from "@/lib/prisma";
import { getDefaultCommissionRate, nextPartnerCommissionId } from "@/lib/partner-service";

export type FinalizeCommissionInput = {
  companyUserId: bigint;
  orderRef: string;
  amount: number;
  subscriptionId?: bigint | null;
  invoiceId?: bigint | null;
};

/**
 * Create a pending partner commission for a paid company order.
 * - Resolves the company's attributed partner; no-op if none.
 * - No-op when amount <= 0.
 * - Idempotent on `orderRef` (unique), so retried payment webhooks won't double-pay.
 * - Advances the matching partner_referrals row to `active`.
 *
 * Designed to be wrapped in try/catch by callers so it never breaks the payment flow.
 */
export async function finalizePartnerCommissionForOrder(input: FinalizeCommissionInput): Promise<void> {
  const { companyUserId, orderRef, amount } = input;
  if (!orderRef || amount <= 0) return;

  const company = await prisma.user.findFirst({
    where: { id: companyUserId },
    select: { partnerId: true },
  });
  if (!company?.partnerId) return;

  const partnerId = company.partnerId;

  // Idempotency: skip if a commission already exists for this order reference.
  const existing = await prisma.partnerCommission.findFirst({
    where: { orderRef },
    select: { id: true },
  });
  if (existing) return;

  const partner = await prisma.partner.findFirst({
    where: { id: partnerId },
    select: { id: true, commissionRate: true, status: true },
  });
  if (!partner) return;

  const rate = partner.commissionRate != null ? Number(partner.commissionRate) : await getDefaultCommissionRate();
  if (!(rate > 0)) return;

  const commissionAmount = Math.round(amount * rate) / 100;

  try {
    await prisma.partnerCommission.create({
      data: {
        id: await nextPartnerCommissionId(),
        partnerId,
        companyId: companyUserId,
        subscriptionId: input.subscriptionId ?? null,
        invoiceId: input.invoiceId ?? null,
        orderRef,
        amount,
        commissionRate: rate,
        commissionAmount,
        status: "pending",
        createdAt: new Date(),
      },
    });
  } catch (err) {
    // Unique violation means a concurrent request already created it — safe to ignore.
    const code = (err as { code?: string })?.code;
    if (code !== "P2002") throw err;
    return;
  }

  // Advance the partner referral to active now that the company is paying.
  await prisma.partnerReferral.updateMany({
    where: { partnerId, companyId: companyUserId, referralStatus: { in: ["pending", "trial"] } },
    data: { referralStatus: "active", updatedAt: new Date() },
  });
}
