import "server-only";

import { Prisma } from "@prisma/client";

import { readGlobalCommissionRate } from "@/lib/event-platform/dashboard-service";
import { prisma } from "@/lib/prisma";

export type CommissionLedgerDto = {
  id: string;
  vendorId: string;
  vendorName: string;
  eventId: string | null;
  grossAmount: string;
  platformCommission: string;
  vendorNet: string;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
};

export function serializeLedgerRow(
  row: Prisma.EventCommissionLedgerGetPayload<{ include: { vendor: { select: { vendorName: true } } } }>,
): CommissionLedgerDto {
  return {
    id: row.id.toString(),
    vendorId: row.vendorId.toString(),
    vendorName: row.vendor.vendorName,
    eventId: row.eventId?.toString() ?? null,
    grossAmount: row.grossAmount.toString(),
    platformCommission: row.platformCommission.toString(),
    vendorNet: row.vendorNet.toString(),
    currency: row.currency,
    status: row.status,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCommissionLedger(organizationId: bigint, limit = 100) {
  const rows = await prisma.eventCommissionLedger.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { vendor: { select: { vendorName: true } } },
  });
  return rows.map(serializeLedgerRow);
}

/** Resolves commission %: vendor override → vendor default → global setting. */
export async function resolveVendorCommissionRate(
  organizationId: bigint,
  vendorId: bigint,
  eventId?: bigint | null,
): Promise<number> {
  if (eventId != null) {
    const eventRule = await prisma.eventVendorCommissionRule.findFirst({
      where: { organizationId, eventId, isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    if (eventRule) return Number(eventRule.commissionRate);
  }

  const vendor = await prisma.eventVendor.findFirst({
    where: { id: vendorId, organizationId },
    select: { overrideCommissionRate: true, defaultCommissionRate: true },
  });
  if (!vendor) return readGlobalCommissionRate(organizationId);

  if (vendor.overrideCommissionRate != null) return Number(vendor.overrideCommissionRate);
  if (vendor.defaultCommissionRate != null) return Number(vendor.defaultCommissionRate);
  return readGlobalCommissionRate(organizationId);
}

/** Resolves vendor for an event via active commission rule. */
export async function resolveEventVendorId(
  organizationId: bigint,
  eventId: bigint,
): Promise<bigint | null> {
  const rule = await prisma.eventVendorCommissionRule.findFirst({
    where: {
      organizationId,
      eventId,
      isActive: true,
      vendorId: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    select: { vendorId: true },
  });
  return rule?.vendorId ?? null;
}

/** Records commission when a paid registration is created. */
export async function maybeRecordRegistrationCommission(input: {
  organizationId: bigint;
  eventId: bigint;
  registrationId: bigint;
  grossAmount: number;
  currency: string;
  createdById?: bigint | null;
}): Promise<void> {
  if (input.grossAmount <= 0) return;

  const vendorId = await resolveEventVendorId(input.organizationId, input.eventId);
  if (!vendorId) return;

  const existing = await prisma.eventCommissionLedger.findFirst({
    where: {
      organizationId: input.organizationId,
      registrationId: input.registrationId,
    },
  });
  if (existing) return;

  await recordCommissionLedgerEntry({
    organizationId: input.organizationId,
    vendorId,
    eventId: input.eventId,
    registrationId: input.registrationId,
    grossAmount: input.grossAmount,
    currency: input.currency,
    createdById: input.createdById ?? null,
  });
}

/** Records ledger entry when a paid registration completes (call from checkout webhook later). */
export async function recordCommissionLedgerEntry(input: {
  organizationId: bigint;
  vendorId: bigint;
  eventId?: bigint | null;
  registrationId?: bigint | null;
  transactionId?: bigint | null;
  grossAmount: number;
  currency?: string;
  createdById?: bigint | null;
}): Promise<void> {
  const rate = await resolveVendorCommissionRate(input.organizationId, input.vendorId, input.eventId ?? null);
  const gross = new Prisma.Decimal(input.grossAmount);
  const platformCommission = gross.mul(rate).div(100);
  const vendorNet = gross.sub(platformCommission);

  await prisma.eventCommissionLedger.create({
    data: {
      organizationId: input.organizationId,
      vendorId: input.vendorId,
      eventId: input.eventId ?? null,
      registrationId: input.registrationId ?? null,
      transactionId: input.transactionId ?? null,
      grossAmount: gross,
      platformCommission,
      vendorNet,
      currency: (input.currency ?? "USD").slice(0, 3),
      status: "pending",
      createdById: input.createdById ?? null,
      updatedById: input.createdById ?? null,
    },
  });
}
