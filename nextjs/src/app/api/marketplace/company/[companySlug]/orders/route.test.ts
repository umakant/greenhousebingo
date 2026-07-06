import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/marketplace-company-guard-slug", () => ({ guardCompanyMarketplaceBySlug: vi.fn() }));
vi.mock("@/lib/marketplace-accounting-sync", () => ({
  syncMarketplacePaidOrderToAccounting: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/marketplace/deliveryQueue", () => ({
  normalizeCityState: vi.fn((city: string, state: string) => ({ city, state })),
  encodeCityStateParam: vi.fn(() => "seg"),
  updateDeliveryCityQueue: vi.fn(),
}));
vi.mock("@/lib/marketplace-notification-service", () => ({
  notifyMarketplaceOrderConfirmation: vi.fn().mockResolvedValue(undefined),
  notifyMarketplaceCityReadyAdmin: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/marketplace-service", () => ({
  generateOrderNumber: vi.fn().mockResolvedValue("MP-20260605-0002"),
  serializeOrderV2: vi.fn((o: { id: bigint }) => ({ id: o.id.toString() })),
}));
vi.mock("@/lib/partner-marketplace-commission-service", () => ({
  finalizePartnerMarketplaceCommission: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/waterice/waterice-stripe", () => ({ resolveWaterIceStripe: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceProduct: { findMany: vi.fn() },
    marketplaceConfig: { findMany: vi.fn().mockResolvedValue([]) },
    user: { findUnique: vi.fn() },
    marketplaceOrder: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { guardCompanyMarketplaceBySlug } from "@/lib/marketplace-company-guard-slug";
import { updateDeliveryCityQueue } from "@/lib/marketplace/deliveryQueue";
import { notifyMarketplaceOrderConfirmation } from "@/lib/marketplace-notification-service";
import { syncMarketplacePaidOrderToAccounting } from "@/lib/marketplace-accounting-sync";
import { resolveWaterIceStripe } from "@/lib/waterice/waterice-stripe";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/marketplace/company/[companySlug]/orders/route";

const guard = guardCompanyMarketplaceBySlug as unknown as Mock;
const updateQueue = updateDeliveryCityQueue as unknown as Mock;
const notifyConfirm = notifyMarketplaceOrderConfirmation as unknown as Mock;
const acctSync = syncMarketplacePaidOrderToAccounting as unknown as Mock;
const stripeResolve = resolveWaterIceStripe as unknown as Mock;
const productFindMany = prisma.marketplaceProduct.findMany as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;
const txn = prisma.$transaction as unknown as Mock;

const orderCreate = vi.fn();

function makeReq(body: Record<string, unknown>) {
  return { headers: { get: () => null }, cookies: { get: () => undefined }, json: async () => body } as never;
}
const params = Promise.resolve({ companySlug: "acme" });

function productRow(bucket: number) {
  return { id: 1n, vendorId: 7n, name: "Cherry", price: 10, currency: "USD", bucketCountValue: bucket };
}

beforeEach(() => {
  vi.clearAllMocks();
  guard.mockResolvedValue({ ok: true, ctx: { organizationId: 100n, userId: 5n } });
  stripeResolve.mockResolvedValue(null); // mock-paid path (NODE_ENV=test)
  userFindUnique.mockResolvedValue({ partnerId: null, referralSource: null, name: "Acme", email: "acme@example.com" });
  updateQueue.mockResolvedValue({
    becameReady: false,
    currentBucketTotal: 6,
    requiredBucketMinimum: 50,
    companyCount: 1,
  });
  orderCreate.mockResolvedValue({
    id: 9n,
    orderNumber: "MP-20260605-0002",
    vendor: { name: "Water Ice Express" },
    items: [],
  });
  txn.mockImplementation((fn: (tx: unknown) => unknown) => fn({ marketplaceOrder: { create: orderCreate } }));
});

describe("POST /api/marketplace/company/[companySlug]/orders (live path)", () => {
  it("blocks checkout below the 6-bucket minimum", async () => {
    productFindMany.mockResolvedValue([productRow(1)]);
    const res = await POST(makeReq({ items: [{ productId: "1", quantity: 5 }], city: "Jacksonville", state: "FL" }), { params });
    expect(res.status).toBe(400);
    expect(txn).not.toHaveBeenCalled();
  });

  it("creates a paid order, delegates to the queue service, and notifies", async () => {
    productFindMany.mockResolvedValue([productRow(1)]);
    const res = await POST(makeReq({ items: [{ productId: "1", quantity: 6 }], city: "Jacksonville", state: "FL" }), { params });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);

    // Correct statuses (matches the global checkout path + dashboard expectations).
    const data = orderCreate.mock.calls[0][0].data;
    expect(data.status).toBe("paid");
    expect(data.orderStatus).toBe("paid");
    expect(data.deliveryStatus).toBe("waiting_for_city_minimum");

    // Delegates queue accounting to the shared service (normalized keys, distinct companies, ready_to_schedule).
    expect(updateQueue).toHaveBeenCalledTimes(1);
    const qArg = updateQueue.mock.calls[0][0];
    expect(qArg.vendorId).toBe(7n);
    expect(qArg.bucketCount).toBe(6);
    expect(qArg.companyId).toBe(100n);

    // Confirmation notification + accounting sync fire on the live path.
    expect(notifyConfirm).toHaveBeenCalledTimes(1);
    expect(acctSync).toHaveBeenCalledWith({ orderId: 9n });
  });
});
