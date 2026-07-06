import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/marketplace-admin-api-guard", () => ({ guardMarketplaceAdmin: vi.fn() }));
vi.mock("@/lib/marketplace/deliveryQueue", () => ({
  decodeCityStateParam: vi.fn(),
  getOrdersForCityQueue: vi.fn(),
}));
vi.mock("@/lib/marketplace-notification-service", () => ({
  notifyMarketplaceDeliveryScheduled: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceVendor: { findFirst: vi.fn() },
    user: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { guardMarketplaceAdmin } from "@/lib/marketplace-admin-api-guard";
import { decodeCityStateParam, getOrdersForCityQueue } from "@/lib/marketplace/deliveryQueue";
import { notifyMarketplaceDeliveryScheduled } from "@/lib/marketplace-notification-service";
import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/marketplace/admin/delivery-queue/[cityState]/schedule/route";

const guard = guardMarketplaceAdmin as unknown as Mock;
const decode = decodeCityStateParam as unknown as Mock;
const getOrders = getOrdersForCityQueue as unknown as Mock;
const notify = notifyMarketplaceDeliveryScheduled as unknown as Mock;
const vendorFindFirst = prisma.marketplaceVendor.findFirst as unknown as Mock;
const userFindMany = prisma.user.findMany as unknown as Mock;
const txn = prisma.$transaction as unknown as Mock;

const eventCreate = vi.fn();
const eventOrderCreateMany = vi.fn();
const orderUpdateMany = vi.fn();
const queueUpdate = vi.fn();
const queueFindUnique = vi.fn();

function makeReq(body: Record<string, unknown>) {
  return { json: async () => body, cookies: { get: () => undefined } } as never;
}
const params = Promise.resolve({ cityState: "seg" });

const ORDERS = [
  { id: "1", orderNumber: "MP-1", companyId: "100", buyerOrganizationId: "100" },
  { id: "2", orderNumber: "MP-2", companyId: "200", buyerOrganizationId: "200" },
];

beforeEach(() => {
  vi.clearAllMocks();
  guard.mockResolvedValue(null); // allowed
  decode.mockReturnValue({ vendorId: 7n, city: "Jacksonville", state: "FL" });
  getOrders.mockResolvedValue(ORDERS);
  vendorFindFirst.mockResolvedValue({ id: 7n, name: "Water Ice Express" });
  userFindMany.mockResolvedValue([
    { id: 100n, name: "Acme", email: "acme@example.com" },
    { id: 200n, name: "Beta", email: "beta@example.com" },
  ]);
  queueFindUnique.mockResolvedValue({ id: 5n });
  eventCreate.mockResolvedValue({ id: 99n });
  eventOrderCreateMany.mockResolvedValue({ count: 2 });
  orderUpdateMany.mockResolvedValue({ count: 2 });
  queueUpdate.mockResolvedValue({});
  txn.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn({
      deliveryCityQueue: { findUnique: queueFindUnique, update: queueUpdate },
      deliveryEvent: { create: eventCreate },
      deliveryEventOrder: { createMany: eventOrderCreateMany },
      marketplaceOrder: { updateMany: orderUpdateMany },
    }),
  );
});

describe("POST .../delivery-queue/[cityState]/schedule", () => {
  it("rejects an unauthorized caller", async () => {
    guard.mockResolvedValue({ status: 403 });
    const res = (await POST(makeReq({}), { params })) as unknown as { status: number };
    expect(res.status).toBe(403);
  });

  it("requires a delivery date", async () => {
    const res = await POST(makeReq({}), { params });
    expect(res.status).toBe(400);
  });

  it("returns 400 when the city queue has no paid orders", async () => {
    getOrders.mockResolvedValue([]);
    const res = await POST(makeReq({ deliveryDate: "2026-07-01" }), { params });
    expect(res.status).toBe(400);
  });

  it("creates the event, attaches orders, marks scheduled, and notifies companies", async () => {
    const res = await POST(
      makeReq({ deliveryDate: "2026-07-01", startTime: "09:00", endTime: "12:00", driverName: "Sam" }),
      { params },
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.eventId).toBe("99");
    expect(body.scheduledOrders).toBe(2);

    // Event + attachments created.
    expect(eventCreate).toHaveBeenCalledTimes(1);
    expect(eventOrderCreateMany).toHaveBeenCalledTimes(1);
    expect(eventOrderCreateMany.mock.calls[0][0].data).toHaveLength(2);

    // Orders moved to scheduled.
    const orderData = orderUpdateMany.mock.calls[0][0].data;
    expect(orderData.orderStatus).toBe("scheduled");
    expect(orderData.status).toBe("scheduled");
    expect(orderData.deliveryStatus).toBe("scheduled");

    // Queue flipped to scheduled.
    expect(queueUpdate.mock.calls[0][0].data.queueStatus).toBe("scheduled");

    // Each unique buyer notified.
    expect(notify).toHaveBeenCalledTimes(2);
  });
});
