import "server-only";

import { prisma } from "@/lib/prisma";

/** Order status lifecycle (display order). */
export const MARKETPLACE_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export const MARKETPLACE_DELIVERY_STATUSES = [
  "queued",
  "assigned",
  "in_transit",
  "delivered",
  "failed",
] as const;

export function slugify(input: string): string {
  return (input || "")
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

export async function ensureUniqueVendorSlug(base: string): Promise<string> {
  const root = slugify(base) || "vendor";
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.marketplaceVendor.findFirst({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

export async function ensureUniqueProductSlug(base: string): Promise<string> {
  const root = slugify(base) || "product";
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.marketplaceProduct.findFirst({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  // Random suffix keeps it unique without a counter table; retried by unique index on conflict.
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MP-${ymd}-${rand}`;
}

type VendorRow = {
  id: bigint;
  name: string;
  slug: string;
  contactEmail: string | null;
  phone: string | null;
  description: string | null;
  logoUrl: string | null;
  commissionRate: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export function serializeVendor(
  v: VendorRow & { _count?: { products: number } },
  extras?: { orderCount?: number; revenue?: number },
) {
  return {
    id: v.id.toString(),
    name: v.name,
    slug: v.slug,
    contactEmail: v.contactEmail,
    phone: v.phone,
    description: v.description,
    logoUrl: v.logoUrl,
    commissionRate: v.commissionRate == null ? null : Number(v.commissionRate),
    status: v.status,
    productCount: v._count?.products ?? 0,
    orderCount: extras?.orderCount ?? 0,
    revenue: extras?.revenue ?? 0,
    createdAt: v.createdAt.toISOString(),
  };
}

type ProductRow = {
  id: bigint;
  vendorId: bigint;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  price: unknown;
  currency: string;
  imageUrl: string | null;
  category: string | null;
  stock: number | null;
  status: string;
  createdAt: Date;
};

export function serializeProduct(
  p: ProductRow & { vendor?: { name: string; logoUrl?: string | null; logo?: string | null } | null },
) {
  return {
    id: p.id.toString(),
    vendorId: p.vendorId.toString(),
    vendorName: p.vendor?.name ?? null,
    vendorLogoUrl: p.vendor?.logoUrl ?? p.vendor?.logo ?? null,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    price: Number(p.price),
    currency: p.currency,
    imageUrl: p.imageUrl,
    category: p.category,
    stock: p.stock,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  };
}

type OrderLineRow = {
  id: bigint;
  orderId: bigint;
  productId: bigint | null;
  vendorId: bigint | null;
  title: string;
  unitPrice: unknown;
  quantity: number;
  lineTotal: unknown;
};

export function serializeOrderLine(l: OrderLineRow) {
  return {
    id: l.id.toString(),
    productId: l.productId == null ? null : l.productId.toString(),
    vendorId: l.vendorId == null ? null : l.vendorId.toString(),
    title: l.title,
    unitPrice: Number(l.unitPrice),
    quantity: l.quantity,
    lineTotal: Number(l.lineTotal),
  };
}

type OrderRow = {
  id: bigint;
  orderNumber: string;
  buyerOrganizationId: bigint;
  placedByUserId: bigint | null;
  status: string;
  paymentStatus: string;
  subtotal: unknown;
  total: unknown;
  currency: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  lines?: OrderLineRow[];
};

export function serializeOrder(o: OrderRow) {
  return {
    id: o.id.toString(),
    orderNumber: o.orderNumber,
    buyerOrganizationId: o.buyerOrganizationId.toString(),
    placedByUserId: o.placedByUserId == null ? null : o.placedByUserId.toString(),
    status: o.status,
    paymentStatus: o.paymentStatus,
    subtotal: Number(o.subtotal),
    total: Number(o.total),
    currency: o.currency,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt ? o.updatedAt.toISOString() : null,
    lines: (o.lines ?? []).map(serializeOrderLine),
  };
}

type CompanyVendorRow = {
  id: bigint;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  logoUrl: string | null;
  bannerImage: string | null;
  status: string;
};

/** Public-facing vendor card for the company storefront. */
export function serializeCompanyVendor(v: CompanyVendorRow & { _count?: { products: number } }) {
  return {
    id: v.id.toString(),
    name: v.name,
    slug: v.slug,
    description: v.description,
    logo: v.logo ?? v.logoUrl ?? null,
    bannerImage: v.bannerImage ?? null,
    status: v.status,
    productCount: v._count?.products ?? 0,
  };
}

type CompanyProductRow = {
  id: bigint;
  vendorId: bigint;
  categoryId: bigint | null;
  name: string;
  slug: string;
  description: string | null;
  price: unknown;
  currency: string;
  image: string | null;
  imageUrl: string | null;
  category: string | null;
  bucketCountValue: number | null;
  inventoryCount: number | null;
  stock: number | null;
};

/** Public-facing product card for the company storefront (uses bucket model fields). */
export function serializeCompanyProduct(p: CompanyProductRow) {
  return {
    id: p.id.toString(),
    vendorId: p.vendorId.toString(),
    categoryId: p.categoryId == null ? null : p.categoryId.toString(),
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: Number(p.price),
    currency: p.currency,
    image: p.image ?? p.imageUrl ?? null,
    category: p.category,
    bucketCountValue: p.bucketCountValue ?? 0,
    inventoryCount: p.inventoryCount ?? p.stock ?? null,
  };
}

type OrderItemRow = {
  id: bigint;
  orderId: bigint;
  productId: bigint | null;
  productName: string;
  quantity: number;
  unitPrice: unknown;
  totalPrice: unknown;
  bucketCountValue: number | null;
};

export function serializeOrderItem(i: OrderItemRow) {
  return {
    id: i.id.toString(),
    productId: i.productId == null ? null : i.productId.toString(),
    productName: i.productName,
    quantity: i.quantity,
    unitPrice: Number(i.unitPrice),
    totalPrice: Number(i.totalPrice),
    bucketCountValue: i.bucketCountValue ?? 0,
  };
}

type OrderV2Row = {
  id: bigint;
  orderNumber: string;
  buyerOrganizationId: bigint;
  companyId: bigint | null;
  vendorId: bigint | null;
  status: string;
  orderStatus: string | null;
  paymentStatus: string;
  deliveryStatus: string | null;
  city: string | null;
  state: string | null;
  totalBucketCount: number | null;
  subtotal: unknown;
  tax: unknown;
  deliveryFee: unknown;
  total: unknown;
  totalAmount: unknown;
  currency: string;
  stripePaymentIntentId: string | null;
  partnerId?: bigint | null;
  referralSource?: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  items?: OrderItemRow[];
  vendor?: { name: string } | null;
};

/** Company storefront order (bucket/totals model with line items). */
export function serializeOrderV2(o: OrderV2Row) {
  return {
    id: o.id.toString(),
    orderNumber: o.orderNumber,
    buyerOrganizationId: o.buyerOrganizationId.toString(),
    companyId: o.companyId == null ? null : o.companyId.toString(),
    vendorId: o.vendorId == null ? null : o.vendorId.toString(),
    vendorName: o.vendor?.name ?? null,
    status: o.status,
    orderStatus: o.orderStatus ?? o.status,
    paymentStatus: o.paymentStatus,
    deliveryStatus: o.deliveryStatus ?? null,
    city: o.city,
    state: o.state,
    totalBucketCount: o.totalBucketCount ?? 0,
    subtotal: Number(o.subtotal),
    tax: o.tax == null ? 0 : Number(o.tax),
    deliveryFee: o.deliveryFee == null ? 0 : Number(o.deliveryFee),
    total: o.totalAmount == null ? Number(o.total) : Number(o.totalAmount),
    currency: o.currency,
    stripePaymentIntentId: o.stripePaymentIntentId,
    partnerId: o.partnerId == null ? null : o.partnerId.toString(),
    referralSource: o.referralSource ?? null,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt ? o.updatedAt.toISOString() : null,
    items: (o.items ?? []).map(serializeOrderItem),
  };
}

type CityQueueRow = {
  id: bigint;
  vendorId: bigint;
  city: string;
  state: string;
  requiredBucketMinimum: number;
  currentBucketTotal: number;
  companyCount: number;
  queueStatus: string;
  createdAt: Date;
  updatedAt: Date | null;
  vendor?: { name: string } | null;
};

export function serializeCityQueue(q: CityQueueRow) {
  const remaining = Math.max(0, q.requiredBucketMinimum - q.currentBucketTotal);
  return {
    id: q.id.toString(),
    vendorId: q.vendorId.toString(),
    vendorName: q.vendor?.name ?? null,
    city: q.city,
    state: q.state,
    requiredBucketMinimum: q.requiredBucketMinimum,
    currentBucketTotal: q.currentBucketTotal,
    bucketsRemaining: remaining,
    companyCount: q.companyCount,
    queueStatus: q.queueStatus,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt ? q.updatedAt.toISOString() : null,
  };
}

type DeliveryEventRowV2 = {
  id: bigint;
  vendorId: bigint;
  city: string;
  state: string;
  deliveryDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  deliveryAddress: string | null;
  deliveryNotes: string | null;
  driverName: string | null;
  driverPhone: string | null;
  status: string;
  createdAt: Date;
};

export function serializeDeliveryEventV2(e: DeliveryEventRowV2) {
  return {
    id: e.id.toString(),
    vendorId: e.vendorId.toString(),
    city: e.city,
    state: e.state,
    deliveryDate: e.deliveryDate ? e.deliveryDate.toISOString() : null,
    startTime: e.startTime,
    endTime: e.endTime,
    deliveryAddress: e.deliveryAddress,
    deliveryNotes: e.deliveryNotes,
    driverName: e.driverName,
    driverPhone: e.driverPhone,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
  };
}

type QueueRow = {
  id: bigint;
  name: string;
  description: string | null;
  region: string | null;
  status: string;
  createdAt: Date;
};

export function serializeQueue(q: QueueRow & { _count?: { deliveries: number } }) {
  return {
    id: q.id.toString(),
    name: q.name,
    description: q.description,
    region: q.region,
    status: q.status,
    deliveryCount: q._count?.deliveries ?? 0,
    createdAt: q.createdAt.toISOString(),
  };
}

type DeliveryEventRow = {
  id: bigint;
  status: string;
  note: string | null;
  createdByUserId: bigint | null;
  createdAt: Date;
};

type DeliveryRow = {
  id: bigint;
  orderId: bigint;
  queueId: bigint | null;
  buyerOrganizationId: bigint;
  status: string;
  assignedTo: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  scheduledAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  events?: DeliveryEventRow[];
  order?: { orderNumber: string } | null;
  queue?: { name: string } | null;
};

export function serializeDelivery(d: DeliveryRow) {
  return {
    id: d.id.toString(),
    orderId: d.orderId.toString(),
    orderNumber: d.order?.orderNumber ?? null,
    queueId: d.queueId == null ? null : d.queueId.toString(),
    queueName: d.queue?.name ?? null,
    status: d.status,
    assignedTo: d.assignedTo,
    address: {
      line: d.addressLine,
      city: d.city,
      state: d.state,
      postalCode: d.postalCode,
      country: d.country,
    },
    scheduledAt: d.scheduledAt ? d.scheduledAt.toISOString() : null,
    deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
    events: (d.events ?? []).map((e) => ({
      id: e.id.toString(),
      status: e.status,
      note: e.note,
      createdByUserId: e.createdByUserId == null ? null : e.createdByUserId.toString(),
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
