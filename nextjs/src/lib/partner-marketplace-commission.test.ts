import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    partner: { findFirst: vi.fn() },
    partnerCommission: { findFirst: vi.fn(), create: vi.fn() },
    partnerReferral: { updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/partner-service", () => ({
  nextPartnerCommissionId: vi.fn().mockResolvedValue(1n),
  resolveMarketplaceCommissionRule: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { resolveMarketplaceCommissionRule } from "@/lib/partner-service";
import { finalizePartnerMarketplaceCommission } from "@/lib/partner-marketplace-commission-service";

const userFindFirst = prisma.user.findFirst as unknown as Mock;
const partnerFindFirst = prisma.partner.findFirst as unknown as Mock;
const commissionFindFirst = prisma.partnerCommission.findFirst as unknown as Mock;
const commissionCreate = prisma.partnerCommission.create as unknown as Mock;
const referralUpdateMany = prisma.partnerReferral.updateMany as unknown as Mock;
const resolveRule = resolveMarketplaceCommissionRule as unknown as Mock;

const PAID_PARTNER = {
  id: 55n,
  status: "active",
  marketplaceCommissionType: "percentage",
  marketplaceCommissionValue: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  partnerFindFirst.mockResolvedValue(PAID_PARTNER);
  commissionFindFirst.mockResolvedValue(null);
  referralUpdateMany.mockResolvedValue({ count: 0 });
});

describe("finalizePartnerMarketplaceCommission", () => {
  it("does nothing for a non-positive amount (paid-only / positive guard)", async () => {
    await finalizePartnerMarketplaceCommission({
      companyUserId: 100n,
      marketplaceOrderId: 1n,
      orderNumber: "MP-1",
      amount: 0,
      partnerId: 55n,
    });
    expect(commissionCreate).not.toHaveBeenCalled();
  });

  it("does nothing when no partner is attributed", async () => {
    userFindFirst.mockResolvedValue({ partnerId: null });
    await finalizePartnerMarketplaceCommission({
      companyUserId: 100n,
      marketplaceOrderId: 1n,
      orderNumber: "MP-1",
      amount: 100,
      partnerId: null,
    });
    expect(partnerFindFirst).not.toHaveBeenCalled();
    expect(commissionCreate).not.toHaveBeenCalled();
  });

  it("creates a percentage-based marketplace commission", async () => {
    resolveRule.mockResolvedValue({ type: "percentage", value: 10 });
    await finalizePartnerMarketplaceCommission({
      companyUserId: 100n,
      marketplaceOrderId: 42n,
      orderNumber: "MP-20260605-1234",
      amount: 100,
      partnerId: 55n,
    });

    expect(commissionCreate).toHaveBeenCalledTimes(1);
    const data = commissionCreate.mock.calls[0][0].data;
    expect(data.sourceType).toBe("marketplace");
    expect(data.marketplaceOrderId).toBe(42n);
    expect(data.commissionRate).toBe(10);
    expect(data.commissionAmount).toBe(10); // 10% of 100
    expect(data.orderRef).toBe("mp:MP-20260605-1234");
    expect(data.status).toBe("pending");
    // referral promoted to active after first purchase
    expect(referralUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("creates a flat marketplace commission capped at the order total", async () => {
    resolveRule.mockResolvedValue({ type: "flat", value: 5 });
    await finalizePartnerMarketplaceCommission({
      companyUserId: 100n,
      marketplaceOrderId: 43n,
      orderNumber: "MP-2",
      amount: 100,
      partnerId: 55n,
    });
    const data = commissionCreate.mock.calls[0][0].data;
    expect(data.commissionRate).toBe(0);
    expect(data.commissionAmount).toBe(5);
  });

  it("creates nothing when the rule is 'none' / zero (commission optional)", async () => {
    resolveRule.mockResolvedValue({ type: "none", value: 0 });
    await finalizePartnerMarketplaceCommission({
      companyUserId: 100n,
      marketplaceOrderId: 44n,
      orderNumber: "MP-3",
      amount: 100,
      partnerId: 55n,
    });
    expect(commissionCreate).not.toHaveBeenCalled();
  });

  it("is idempotent on the marketplace orderRef", async () => {
    resolveRule.mockResolvedValue({ type: "percentage", value: 10 });
    commissionFindFirst.mockResolvedValue({ id: 9n }); // already recorded
    await finalizePartnerMarketplaceCommission({
      companyUserId: 100n,
      marketplaceOrderId: 45n,
      orderNumber: "MP-4",
      amount: 100,
      partnerId: 55n,
    });
    expect(commissionCreate).not.toHaveBeenCalled();
  });
});
