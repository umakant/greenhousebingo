import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => {
  const prisma = {
    deliveryCityQueue: { findUnique: vi.fn() },
    marketplaceOrder: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});

import { prisma } from "@/lib/prisma";
import {
  QUEUE_STATUS_READY,
  QUEUE_STATUS_WAITING,
  decodeCityStateParam,
  encodeCityStateParam,
  getCityQueueProgress,
  getOrdersForCityQueue,
  normalizeCityState,
  updateDeliveryCityQueue,
} from "@/lib/marketplace/deliveryQueue";

type AnyMock = Mock;
const queueFindUnique = prisma.deliveryCityQueue.findUnique as unknown as AnyMock;
const orderFindMany = prisma.marketplaceOrder.findMany as unknown as AnyMock;
const txn = prisma.$transaction as unknown as AnyMock;

/** Builds a transaction client whose ops the test can inspect. */
function makeTx(existingQueue: Record<string, unknown> | null) {
  return {
    deliveryCityQueue: {
      findUnique: vi.fn().mockResolvedValue(existingQueue),
      create: vi.fn(({ data }: { data: Record<string, unknown> }) => ({
        id: 10n,
        requiredBucketMinimum: 50,
        ...data,
      })),
      update: vi.fn(({ data }: { data: Record<string, unknown> }) => ({
        id: (existingQueue?.id as bigint) ?? 5n,
        vendorId: 7n,
        city: "Jacksonville",
        state: "FL",
        requiredBucketMinimum: 50,
        ...data,
      })),
    },
    marketplaceOrder: { findMany: vi.fn().mockResolvedValue([]) },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("normalizeCityState", () => {
  it("collapses equivalent city/state spellings to one canonical form", () => {
    const a = normalizeCityState("Jacksonville", "FL");
    const b = normalizeCityState("  jacksonville ", "florida");
    expect(a).toEqual({ city: "Jacksonville", state: "FL" });
    expect(b).toEqual(a);
  });

  it("title-cases multi-word cities and uppercases unknown states", () => {
    expect(normalizeCityState("new york", "ny")).toEqual({ city: "New York", state: "NY" });
    expect(normalizeCityState("springfield", "zz")).toEqual({ city: "Springfield", state: "ZZ" });
  });
});

describe("encode/decode city-state route segment", () => {
  it("round-trips vendor + city + state", () => {
    const param = encodeCityStateParam(7n, "jacksonville", "florida");
    const decoded = decodeCityStateParam(param);
    expect(decoded).toEqual({ vendorId: 7n, city: "Jacksonville", state: "FL" });
  });

  it("returns null for malformed segments", () => {
    expect(decodeCityStateParam("garbage")).toBeNull();
  });
});

describe("updateDeliveryCityQueue", () => {
  it("creates the queue for the first order in a city", async () => {
    const tx = makeTx(null);
    txn.mockImplementation((fn: (db: unknown) => unknown) => fn(tx));

    const res = await updateDeliveryCityQueue({
      vendorId: 7n,
      city: "Jacksonville",
      state: "FL",
      bucketCount: 8,
      companyId: 100n,
    });

    expect(tx.deliveryCityQueue.create).toHaveBeenCalledTimes(1);
    expect(tx.deliveryCityQueue.update).not.toHaveBeenCalled();
    expect(res.currentBucketTotal).toBe(8);
    expect(res.companyCount).toBe(1);
    expect(res.queueStatus).toBe(QUEUE_STATUS_WAITING);
    expect(res.becameReady).toBe(false);
  });

  it("increments the bucket total for an existing queue", async () => {
    const tx = makeTx({
      id: 5n,
      requiredBucketMinimum: 50,
      currentBucketTotal: 12,
      queueStatus: QUEUE_STATUS_WAITING,
    });
    txn.mockImplementation((fn: (db: unknown) => unknown) => fn(tx));

    const res = await updateDeliveryCityQueue({
      vendorId: 7n,
      city: "Jacksonville",
      state: "FL",
      bucketCount: 10,
      companyId: 101n,
    });

    expect(tx.deliveryCityQueue.update).toHaveBeenCalledTimes(1);
    expect(res.currentBucketTotal).toBe(22);
    expect(res.queueStatus).toBe(QUEUE_STATUS_WAITING);
    expect(res.becameReady).toBe(false);
  });

  it("flips to ready_to_schedule once the 50-bucket minimum is reached", async () => {
    const tx = makeTx({
      id: 5n,
      requiredBucketMinimum: 50,
      currentBucketTotal: 44,
      queueStatus: QUEUE_STATUS_WAITING,
    });
    txn.mockImplementation((fn: (db: unknown) => unknown) => fn(tx));

    const res = await updateDeliveryCityQueue({
      vendorId: 7n,
      city: "Jacksonville",
      state: "FL",
      bucketCount: 6,
      companyId: 102n,
    });

    expect(res.currentBucketTotal).toBe(50);
    expect(res.queueStatus).toBe(QUEUE_STATUS_READY);
    expect(res.becameReady).toBe(true);
  });

  it("keys different cities to different queue rows", async () => {
    const tx = makeTx(null);
    txn.mockImplementation((fn: (db: unknown) => unknown) => fn(tx));

    await updateDeliveryCityQueue({ vendorId: 7n, city: "Jacksonville", state: "FL", bucketCount: 6 });
    await updateDeliveryCityQueue({ vendorId: 7n, city: "Miami", state: "FL", bucketCount: 6 });

    const cities = (
      tx.deliveryCityQueue.findUnique.mock.calls as Array<
        [{ where: { vendorId_city_state: { city: string } } }]
      >
    ).map((c) => c[0].where.vendorId_city_state.city);
    expect(cities).toEqual(["Jacksonville", "Miami"]);
  });

  it("uses the passed transaction client when provided (no extra $transaction)", async () => {
    const tx = makeTx(null);
    await updateDeliveryCityQueue({
      vendorId: 7n,
      city: "Tampa",
      state: "FL",
      bucketCount: 6,
      tx: tx as never,
    });
    expect(txn).not.toHaveBeenCalled();
    expect(tx.deliveryCityQueue.create).toHaveBeenCalledTimes(1);
  });
});

describe("getCityQueueProgress", () => {
  it("returns zeroed defaults when the queue does not exist", async () => {
    queueFindUnique.mockResolvedValue(null);
    const out = await getCityQueueProgress(7n, "Jacksonville", "FL");
    expect(out.exists).toBe(false);
    expect(out.currentBucketTotal).toBe(0);
    expect(out.requiredBucketMinimum).toBe(50);
    expect(out.progressPercent).toBe(0);
    expect(out.queueStatus).toBe(QUEUE_STATUS_WAITING);
  });

  it("computes a clamped progress percentage when present", async () => {
    queueFindUnique.mockResolvedValue({
      vendorId: 7n,
      city: "Jacksonville",
      state: "FL",
      requiredBucketMinimum: 50,
      currentBucketTotal: 25,
      companyCount: 3,
      queueStatus: QUEUE_STATUS_WAITING,
    });
    const out = await getCityQueueProgress(7n, "Jacksonville", "FL");
    expect(out.exists).toBe(true);
    expect(out.progressPercent).toBe(50);
    expect(out.companyCount).toBe(3);
  });
});

describe("getOrdersForCityQueue", () => {
  it("filters vendor orders to the normalized target city/state", async () => {
    orderFindMany.mockResolvedValue([
      { id: 1n, orderNumber: "MP-1", companyId: 100n, buyerOrganizationId: 100n, status: "paid", orderStatus: "paid", paymentStatus: "paid", deliveryStatus: "waiting_for_city_minimum", totalBucketCount: 6, city: "jacksonville", state: "florida", createdAt: new Date() },
      { id: 2n, orderNumber: "MP-2", companyId: 200n, buyerOrganizationId: 200n, status: "paid", orderStatus: "paid", paymentStatus: "paid", deliveryStatus: "waiting_for_city_minimum", totalBucketCount: 6, city: "Miami", state: "FL", createdAt: new Date() },
    ]);

    const out = await getOrdersForCityQueue(7n, "Jacksonville", "FL");
    expect(out).toHaveLength(1);
    expect(out[0].orderNumber).toBe("MP-1");
  });
});
