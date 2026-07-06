import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Delivery city-queue service.
 *
 * A "city queue" accumulates bucket counts from many companies ordering from the
 * same vendor in the same city/state. Once the accumulated bucket total reaches
 * the queue's required minimum, the queue flips to `ready_to_schedule` so an
 * operator can schedule a delivery run.
 *
 * City/state values entered by buyers are inconsistent ("FL" vs "Florida",
 * "  jacksonville " vs "Jacksonville"). Everything here is normalized to a single
 * canonical form before reading or writing so equivalent locations always map to
 * the same queue row (guarded by the `@@unique([vendorId, city, state])` index).
 */

export const QUEUE_STATUS_WAITING = "waiting";
export const QUEUE_STATUS_READY = "ready_to_schedule";

/** Default minimum used when a queue row does not yet exist (matches schema default). */
const DEFAULT_REQUIRED_BUCKET_MINIMUM = 50;

/** Order statuses that count toward a city queue. */
const COUNTED_ORDER_STATUSES = ["paid", "scheduled"] as const;

type Db = Prisma.TransactionClient | typeof prisma;

/** Maps US state names and abbreviations to a single canonical 2-letter code. */
const STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "puerto rico": "PR",
};

const VALID_STATE_CODES = new Set(Object.values(STATE_ABBREVIATIONS));

/** Collapses whitespace and lowercases a value for comparison/lookup. */
function squash(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Title-cases a city name for consistent, human-readable storage. */
function toTitleCase(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
        .join("-"),
    )
    .join(" ");
}

/**
 * Normalizes raw city/state input into a canonical form.
 * - State -> 2-letter uppercase code when recognized ("Florida"/"florida"/"fl" -> "FL").
 * - City -> trimmed, whitespace-collapsed, Title Case ("  jacksonville " -> "Jacksonville").
 *
 * This guarantees "Jacksonville, FL" and "jacksonville, florida" resolve to the
 * same queue instead of creating duplicates.
 */
export function normalizeCityState(
  city: string,
  state: string,
): { city: string; state: string } {
  const cityKey = squash(String(city ?? ""));
  const stateRaw = squash(String(state ?? ""));

  let stateCode: string;
  if (STATE_ABBREVIATIONS[stateRaw]) {
    stateCode = STATE_ABBREVIATIONS[stateRaw];
  } else if (VALID_STATE_CODES.has(stateRaw.toUpperCase())) {
    stateCode = stateRaw.toUpperCase();
  } else {
    // Unknown state: keep a stable canonical (uppercased, collapsed) so equivalent
    // free-text values still match each other.
    stateCode = stateRaw.toUpperCase();
  }

  return {
    city: cityKey ? toTitleCase(cityKey) : "",
    state: stateCode,
  };
}

/**
 * Encodes a vendor + city/state into a single, URL-safe route segment for
 * `/admin/marketplace/delivery-queue/[cityState]`. Self-contained (includes the
 * vendor) because city/state alone is not unique across vendors.
 */
export function encodeCityStateParam(
  vendorId: bigint | string | number,
  city: string,
  state: string,
): string {
  const norm = normalizeCityState(city, state);
  return encodeURIComponent(`${vendorId.toString()}~${norm.city}~${norm.state}`);
}

/** Decodes a `[cityState]` route segment back into vendorId + normalized city/state. */
export function decodeCityStateParam(
  param: string,
): { vendorId: bigint; city: string; state: string } | null {
  let raw: string;
  try {
    raw = decodeURIComponent(param);
  } catch {
    raw = param;
  }
  const parts = raw.split("~");
  if (parts.length < 3) return null;
  const vendorRaw = parts[0];
  const stateRaw = parts[parts.length - 1];
  const cityRaw = parts.slice(1, parts.length - 1).join("~");
  let vendorId: bigint;
  try {
    vendorId = BigInt(vendorRaw);
  } catch {
    return null;
  }
  const norm = normalizeCityState(cityRaw, stateRaw);
  if (!norm.city || !norm.state) return null;
  return { vendorId, city: norm.city, state: norm.state };
}

export type CityQueueProgress = {
  vendorId: string;
  city: string;
  state: string;
  currentBucketTotal: number;
  requiredBucketMinimum: number;
  progressPercent: number;
  companyCount: number;
  queueStatus: string;
  exists: boolean;
};

export type CityQueueOrder = {
  id: string;
  orderNumber: string;
  companyId: string | null;
  buyerOrganizationId: string;
  status: string;
  orderStatus: string | null;
  paymentStatus: string;
  deliveryStatus: string | null;
  totalBucketCount: number;
  city: string | null;
  state: string | null;
  createdAt: Date;
};

export type UpdateDeliveryCityQueueResult = {
  id: string;
  vendorId: string;
  city: string;
  state: string;
  currentBucketTotal: number;
  requiredBucketMinimum: number;
  companyCount: number;
  queueStatus: string;
  becameReady: boolean;
};

function clampPercent(current: number, required: number): number {
  if (required <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((current / required) * 100)));
}

/**
 * Counts the distinct companies that have counted orders in a vendor's city queue.
 * The `includeCompanyId` is unioned in so the company that triggered the update is
 * always counted even if its order isn't visible yet (e.g. created later in the
 * same checkout flow).
 */
async function countUniqueCompanies(
  db: Db,
  vendorId: bigint,
  normCity: string,
  normState: string,
  includeCompanyId?: bigint | null,
): Promise<number> {
  const orders = await getOrdersForCityQueue(vendorId, normCity, normState, db, {
    alreadyNormalized: true,
  });
  const companies = new Set<string>();
  for (const o of orders) {
    if (o.companyId) companies.add(o.companyId);
    else companies.add(`org:${o.buyerOrganizationId}`);
  }
  if (includeCompanyId != null) companies.add(includeCompanyId.toString());
  return companies.size;
}

/**
 * Finds or creates the city queue for a vendor+city+state, adds the given bucket
 * count, recomputes the unique company count, and flips the queue status to
 * `ready_to_schedule` once the required minimum is reached. Runs in a transaction
 * so concurrent checkouts can't lose increments or read a half-updated row.
 */
export async function updateDeliveryCityQueue(input: {
  vendorId: bigint | string | number;
  city: string;
  state: string;
  bucketCount: number;
  companyId?: bigint | string | number | null;
  tx?: Prisma.TransactionClient;
}): Promise<UpdateDeliveryCityQueueResult> {
  const vendorId = BigInt(input.vendorId);
  const companyId =
    input.companyId == null || input.companyId === "" ? null : BigInt(input.companyId);
  const bucketCount = Math.max(0, Math.floor(Number(input.bucketCount) || 0));
  const { city, state } = normalizeCityState(input.city, input.state);

  if (!city || !state) {
    throw new Error("updateDeliveryCityQueue: city and state are required.");
  }

  const run = async (db: Prisma.TransactionClient): Promise<UpdateDeliveryCityQueueResult> => {
    const existing = await db.deliveryCityQueue.findUnique({
      where: { vendorId_city_state: { vendorId, city, state } },
    });

    const requiredBucketMinimum = existing?.requiredBucketMinimum ?? DEFAULT_REQUIRED_BUCKET_MINIMUM;
    const newBucketTotal = (existing?.currentBucketTotal ?? 0) + bucketCount;
    const wasReady = existing?.queueStatus === QUEUE_STATUS_READY;
    const queueStatus =
      newBucketTotal >= requiredBucketMinimum ? QUEUE_STATUS_READY : QUEUE_STATUS_WAITING;

    const companyCount = await countUniqueCompanies(db, vendorId, city, state, companyId);

    const saved = existing
      ? await db.deliveryCityQueue.update({
          where: { id: existing.id },
          data: {
            currentBucketTotal: newBucketTotal,
            companyCount,
            queueStatus,
            updatedAt: new Date(),
          },
        })
      : await db.deliveryCityQueue.create({
          data: {
            vendorId,
            city,
            state,
            currentBucketTotal: newBucketTotal,
            companyCount,
            queueStatus,
          },
        });

    return {
      id: saved.id.toString(),
      vendorId: saved.vendorId.toString(),
      city: saved.city,
      state: saved.state,
      currentBucketTotal: saved.currentBucketTotal,
      requiredBucketMinimum: saved.requiredBucketMinimum,
      companyCount: saved.companyCount,
      queueStatus: saved.queueStatus,
      becameReady: queueStatus === QUEUE_STATUS_READY && !wasReady,
    };
  };

  if (input.tx) return run(input.tx);
  return prisma.$transaction(run);
}

/**
 * Returns the progress of a city queue: bucket total, required minimum, completion
 * percentage, unique company count, and status. Returns sensible zeroed defaults
 * when the queue doesn't exist yet.
 */
export async function getCityQueueProgress(
  vendorId: bigint | string | number,
  city: string,
  state: string,
  db: Db = prisma,
): Promise<CityQueueProgress> {
  const vid = BigInt(vendorId);
  const { city: normCity, state: normState } = normalizeCityState(city, state);

  const queue = await db.deliveryCityQueue.findUnique({
    where: { vendorId_city_state: { vendorId: vid, city: normCity, state: normState } },
  });

  if (!queue) {
    return {
      vendorId: vid.toString(),
      city: normCity,
      state: normState,
      currentBucketTotal: 0,
      requiredBucketMinimum: DEFAULT_REQUIRED_BUCKET_MINIMUM,
      progressPercent: 0,
      companyCount: 0,
      queueStatus: QUEUE_STATUS_WAITING,
      exists: false,
    };
  }

  return {
    vendorId: queue.vendorId.toString(),
    city: queue.city,
    state: queue.state,
    currentBucketTotal: queue.currentBucketTotal,
    requiredBucketMinimum: queue.requiredBucketMinimum,
    progressPercent: clampPercent(queue.currentBucketTotal, queue.requiredBucketMinimum),
    companyCount: queue.companyCount,
    queueStatus: queue.queueStatus,
    exists: true,
  };
}

/**
 * Returns all paid/scheduled orders for a vendor in a given city/state. Orders are
 * fetched by vendor + status, then matched against the normalized city/state so
 * historical rows stored as "FL" or "Florida" are both included.
 */
export async function getOrdersForCityQueue(
  vendorId: bigint | string | number,
  city: string,
  state: string,
  db: Db = prisma,
  opts?: { alreadyNormalized?: boolean },
): Promise<CityQueueOrder[]> {
  const vid = BigInt(vendorId);
  const target = opts?.alreadyNormalized
    ? { city, state }
    : normalizeCityState(city, state);

  const orders = await db.marketplaceOrder.findMany({
    where: {
      vendorId: vid,
      OR: [
        { paymentStatus: "paid" },
        { status: { in: [...COUNTED_ORDER_STATUSES] } },
        { orderStatus: { in: [...COUNTED_ORDER_STATUSES] } },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      orderNumber: true,
      companyId: true,
      buyerOrganizationId: true,
      status: true,
      orderStatus: true,
      paymentStatus: true,
      deliveryStatus: true,
      totalBucketCount: true,
      city: true,
      state: true,
      createdAt: true,
    },
  });

  return orders
    .filter((o) => {
      const norm = normalizeCityState(o.city ?? "", o.state ?? "");
      return norm.city === target.city && norm.state === target.state;
    })
    .map((o) => ({
      id: o.id.toString(),
      orderNumber: o.orderNumber,
      companyId: o.companyId ? o.companyId.toString() : null,
      buyerOrganizationId: o.buyerOrganizationId.toString(),
      status: o.status,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      deliveryStatus: o.deliveryStatus,
      totalBucketCount: o.totalBucketCount ?? 0,
      city: o.city,
      state: o.state,
      createdAt: o.createdAt,
    }));
}
