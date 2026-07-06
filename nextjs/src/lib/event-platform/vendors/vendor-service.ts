import "server-only";

import type { EventVendor } from "@prisma/client";

import type { EventVendorDto } from "@/lib/event-platform/vendors/vendor-types";
import { prisma } from "@/lib/prisma";

export type { EventVendorDto } from "@/lib/event-platform/vendors/vendor-types";
export { EVENT_VENDOR_STATUSES } from "@/lib/event-platform/vendors/vendor-types";

export function serializeEventVendor(v: EventVendor): EventVendorDto {
  return {
    id: v.id.toString(),
    organizationId: v.organizationId.toString(),
    vendorName: v.vendorName,
    companyName: v.companyName,
    contactName: v.contactName,
    email: v.email,
    phone: v.phone,
    website: v.website,
    businessType: v.businessType,
    status: v.status,
    defaultCommissionRate: v.defaultCommissionRate?.toString() ?? null,
    overrideCommissionRate: v.overrideCommissionRate?.toString() ?? null,
    payoutMethod: v.payoutMethod,
    taxId: v.taxId,
    addressLine1: v.addressLine1,
    addressLine2: v.addressLine2,
    city: v.city,
    state: v.state,
    postalCode: v.postalCode,
    country: v.country,
    notes: v.notes,
    linkedUserId: v.linkedUserId?.toString() ?? null,
    archivedAt: v.archivedAt?.toISOString() ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt?.toISOString() ?? null,
  };
}

export async function listEventVendors(organizationId: bigint, includeArchived = false) {
  return prisma.eventVendor.findMany({
    where: {
      organizationId,
      ...(includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [{ status: "asc" }, { vendorName: "asc" }],
  });
}

export async function getEventVendorById(organizationId: bigint, id: bigint) {
  return prisma.eventVendor.findFirst({
    where: { id, organizationId },
  });
}
