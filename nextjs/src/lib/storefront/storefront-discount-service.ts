import { prisma } from "@/lib/prisma";

export type DiscountComputation = {
  amount: number;
  codeRow: { id: bigint; ruleId: bigint; code: string } | null;
  reason?: string;
};

function inWindow(startsAt: Date | null, endsAt: Date | null, now: Date): boolean {
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

/**
 * Validates a coupon and returns discount amount capped by subtotal (order scope).
 * Days 31+ — product scope uses productIds on the rule when set.
 */
export async function computeDiscountForCode(params: {
  organizationId: bigint;
  websiteId: bigint;
  code: string;
  subtotal: number;
  productIdsInCart: bigint[];
}): Promise<DiscountComputation> {
  const raw = params.code.trim();
  if (!raw) return { amount: 0, codeRow: null };

  const row = await prisma.storefrontDiscountCode.findFirst({
    where: {
      organizationId: params.organizationId,
      code: { equals: raw, mode: "insensitive" },
    },
    include: { rule: true },
  });

  if (!row?.rule?.isActive) {
    return { amount: 0, codeRow: null, reason: "Invalid or inactive code" };
  }

  const rule = row.rule;
  if (rule.websiteId != null && rule.websiteId !== params.websiteId) {
    return { amount: 0, codeRow: null, reason: "Code not valid for this site" };
  }

  const now = new Date();
  if (!inWindow(rule.startsAt, rule.endsAt, now)) {
    return { amount: 0, codeRow: null, reason: "Code is not valid at this time" };
  }

  if (rule.maxUses != null && row.usesCount >= rule.maxUses) {
    return { amount: 0, codeRow: null, reason: "Code usage limit reached" };
  }

  let applicableSubtotal = params.subtotal;
  if (rule.scope === "line" && rule.productIds) {
    const ids = Array.isArray(rule.productIds)
      ? (rule.productIds as unknown[]).map((x) => BigInt(String(x)))
      : [];
    if (ids.length) {
      const set = new Set(ids.map((id) => id.toString()));
      // Approximate: discount only from matching lines — caller should pass line subtotal; here we scale by cart overlap
      const overlap = params.productIdsInCart.filter((id) => set.has(id.toString())).length;
      if (overlap === 0) {
        return { amount: 0, codeRow: null, reason: "Code does not apply to items in cart" };
      }
      applicableSubtotal = params.subtotal * (overlap / Math.max(1, params.productIdsInCart.length));
    }
  }

  const value = Number(rule.value);
  let discount = 0;
  if (rule.kind === "percent") {
    discount = (applicableSubtotal * value) / 100;
  } else {
    discount = value;
  }
  discount = Math.min(applicableSubtotal, Math.max(0, discount));
  discount = Math.round(discount * 100) / 100;

  return {
    amount: discount,
    codeRow: { id: row.id, ruleId: row.ruleId, code: row.code },
  };
}
