import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/marketplace-cart", () => ({ validateCart: vi.fn() }));
vi.mock("@/lib/marketplace-company-api-guard", () => ({ guardMarketplaceCompany: vi.fn() }));
vi.mock("@/lib/marketplace-notification-service", () => ({
  notifyMarketplaceOrderConfirmation: vi.fn().mockResolvedValue(undefined),
  notifyMarketplaceCityReadyAdmin: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/marketplace-accounting-sync", () => ({
  syncMarketplacePaidOrderToAccounting: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/marketplace/deliveryQueue", () => ({
  encodeCityStateParam: vi.fn(() => "seg"),
  normalizeCityState: vi.fn((city: string, state: string) => ({ city, state })),
}));
vi.mock("@/lib/marketplace-service", () => ({
  generateOrderNumber: vi.fn().mockResolvedValue("MP-20260605-0001"),
  serializeOrderV2: vi.fn((o: { id: bigint }) => ({ id: o.id.toString() })),
}));
vi.mock("@/lib/partner-marketplace-commission-service", () => ({
  finalizePartnerMarketplaceCommission: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/waterice/waterice-stripe", () => ({ resolveWaterIceStripe: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { validateCart } from "@/lib/marketplace-cart";
import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";
import { syncMarketplacePaidOrderToAccounting } from "@/lib/marketplace-accounting-sync";
import { resolveWaterIceStripe } from "@/lib/waterice/waterice-stripe";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/marketplace/checkout/route";

const validate = validateCart as unknown as Mock;
const guard = guardMarketplaceCompany as unknown as Mock;
const stripeResolve = resolveWaterIceStripe as unknown as Mock;
const acctSync = syncMarketplacePaidOrderToAccounting as unknown as Mock;
const userFindUnique = prisma.user.findUnique as unknown as Mock;
const txn = prisma.$transaction as unknown as Mock;

const orderCreate = vi.fn();
const queueFindUnique = vi.fn();
const queueCreate = vi.fn();
const queueUpdate = vi.fn();

function makeReq(body: Record<string, unknown>) {
  return {
    headers: { get: () => null },
    cookies: { get: () => undefined },
    json: async () => body,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  guard.mockResolvedValue({ ok: true, ctx: { organizationId: 100n, userId: 5n, isSuperadmin: false, permissions: [] } });
  stripeResolve.mockResolvedValue(null); // no Stripe → flow is treated as paid
  userFindUnique.mockResolvedValue({ partnerId: null, referralSource: null, name: "Acme", email: "" });
  queueFindUnique.mockResolvedValue(null);
  queueCreate.mockResolvedValue({});
  queueUpdate.mockResolvedValue({});
  orderCreate.mockResolvedValue({
    id: 1n,
    orderNumber: "MP-20260605-0001",
    vendor: { name: "Water Ice Express" },
    items: [],
  });
  txn.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn({
      marketplaceOrder: { create: orderCreate },
      deliveryCityQueue: { findUnique: queueFindUnique, create: queueCreate, update: queueUpdate },
    }),
  );
});

const OK_CART = {
  ok: true,
  vendorId: 7n,
  vendorName: "Water Ice Express",
  currency: "USD",
  lines: [
    { productId: 3n, name: "Cherry", quantity: 6, unitPrice: 10, totalPrice: 60, bucketCountValue: 1, currency: "USD" },
  ],
  totals: { subtotal: 60, tax: 4.8, deliveryFee: 25, total: 89.8, totalBucketCount: 6 },
  pricing: { taxRate: 0.08, deliveryFee: 25, minBuckets: 6 },
  meetsMinimum: true,
};

describe("POST /api/marketplace/checkout", () => {
  it("returns the guard response when access is denied", async () => {
    const denied = { status: 403 };
    guard.mockResolvedValue({ ok: false, response: denied });
    const res = (await POST(makeReq({}))) as unknown as { status: number };
    expect(res.status).toBe(403);
    expect(validate).not.toHaveBeenCalled();
  });

  it("requires a delivery city/state", async () => {
    const res = await POST(makeReq({ items: [{ productId: "3", quantity: 6 }] }));
    expect(res.status).toBe(400);
    expect(txn).not.toHaveBeenCalled();
  });

  it("blocks checkout below the 6-bucket minimum", async () => {
    validate.mockResolvedValue({
      ...OK_CART,
      meetsMinimum: false,
      totals: { ...OK_CART.totals, totalBucketCount: 4 },
    });
    const res = await POST(makeReq({ items: [{ productId: "3", quantity: 4 }], city: "Jacksonville", state: "FL" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.message).toMatch(/Minimum order is 6 buckets/);
    expect(txn).not.toHaveBeenCalled();
  });

  it("creates a paid order with items and waiting_for_city_minimum at/over the minimum", async () => {
    validate.mockResolvedValue(OK_CART);
    const res = await POST(makeReq({ items: [{ productId: "3", quantity: 6 }], city: "Jacksonville", state: "FL" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.orderId).toBe("1");

    // MarketplaceOrder created with the required statuses.
    expect(orderCreate).toHaveBeenCalledTimes(1);
    const data = orderCreate.mock.calls[0][0].data;
    expect(data.status).toBe("paid");
    expect(data.orderStatus).toBe("paid");
    expect(data.paymentStatus).toBe("paid");
    expect(data.deliveryStatus).toBe("waiting_for_city_minimum");
    expect(data.totalBucketCount).toBe(6);

    // MarketplaceOrderItems created alongside the order.
    expect(data.items.create).toHaveLength(1);
    expect(data.items.create[0].productName).toBe("Cherry");

    // First order in the city creates the queue (under 50 → waiting).
    expect(queueCreate).toHaveBeenCalledTimes(1);
    expect(queueCreate.mock.calls[0][0].data.queueStatus).toBe("waiting");

    // Paid order is synced to accounting (best-effort).
    expect(acctSync).toHaveBeenCalledWith({ orderId: 1n });
  });
});
