import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  generateOrderNumber,
  serializeOrderV2,
} from "@/lib/marketplace-service";

function orderRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1n,
    orderNumber: "MP-20260605-1234",
    buyerOrganizationId: 100n,
    companyId: 100n,
    vendorId: 7n,
    vendor: { name: "Water Ice Express" },
    status: "paid",
    orderStatus: "paid",
    paymentStatus: "paid",
    deliveryStatus: "waiting_for_city_minimum",
    city: "Jacksonville",
    state: "FL",
    totalBucketCount: 6,
    subtotal: 60,
    tax: 4.8,
    deliveryFee: 25,
    totalAmount: 89.8,
    total: 89.8,
    currency: "USD",
    stripePaymentIntentId: "pi_123",
    partnerId: 9n,
    referralSource: "partner-link",
    notes: null,
    createdAt: new Date("2026-06-05T12:00:00Z"),
    updatedAt: null,
    items: [
      { id: 11n, productId: 3n, productName: "Cherry", quantity: 6, unitPrice: 10, totalPrice: 60, bucketCountValue: 1 },
    ],
    ...over,
  };
}

describe("serializeOrderV2 (dashboard status surface)", () => {
  it("exposes the paid, pre-scheduling state a company sees", () => {
    const out = serializeOrderV2(orderRow() as never);
    expect(out.paymentStatus).toBe("paid");
    expect(out.orderStatus).toBe("paid");
    expect(out.deliveryStatus).toBe("waiting_for_city_minimum");
    expect(out.total).toBe(89.8);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].productName).toBe("Cherry");
  });

  it("exposes the scheduled state after admin schedules the city delivery", () => {
    const out = serializeOrderV2(
      orderRow({ orderStatus: "scheduled", status: "scheduled", deliveryStatus: "scheduled" }) as never,
    );
    expect(out.orderStatus).toBe("scheduled");
    expect(out.deliveryStatus).toBe("scheduled");
  });

  it("surfaces partner attribution stamped on the order", () => {
    const out = serializeOrderV2(orderRow() as never);
    expect(out.partnerId).toBe("9");
    expect(out.referralSource).toBe("partner-link");
  });
});

describe("generateOrderNumber", () => {
  it("produces an MP-YYYYMMDD-#### order number", async () => {
    const n = await generateOrderNumber();
    expect(n).toMatch(/^MP-\d{8}-\d{4}$/);
  });
});
