import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function createVendorPayoutBatch(input: {
  organizationId: bigint;
  vendorId: bigint;
  notes?: string;
  createdById: bigint;
}): Promise<{ id: string; batchRef: string; totalAmount: string; entryCount: number }> {
  const entries = await prisma.eventCommissionLedger.findMany({
    where: {
      organizationId: input.organizationId,
      vendorId: input.vendorId,
      status: "pending",
    },
    orderBy: { createdAt: "asc" },
  });

  if (entries.length === 0) {
    throw new Error("No pending commission entries for this vendor.");
  }

  const total = entries.reduce((sum, e) => sum.add(e.vendorNet), new Prisma.Decimal(0));
  const currency = entries[0]?.currency ?? "USD";
  const batchRef = `EP-${Date.now().toString(36).toUpperCase()}`;

  const payout = await prisma.$transaction(async (tx) => {
    const created = await tx.eventVendorPayout.create({
      data: {
        organizationId: input.organizationId,
        vendorId: input.vendorId,
        batchRef,
        totalAmount: total,
        currency,
        status: "pending",
        notes: input.notes?.trim() || null,
        createdById: input.createdById,
        updatedById: input.createdById,
      },
    });

    for (const entry of entries) {
      await tx.eventVendorPayoutItem.create({
        data: {
          payoutId: created.id,
          ledgerId: entry.id,
          amount: entry.vendorNet,
        },
      });
      await tx.eventCommissionLedger.update({
        where: { id: entry.id },
        data: {
          status: "batched",
          payoutId: created.id,
          updatedById: input.createdById,
        },
      });
    }

    return created;
  });

  return {
    id: payout.id.toString(),
    batchRef,
    totalAmount: total.toString(),
    entryCount: entries.length,
  };
}

export async function listVendorsWithPendingCommissions(organizationId: bigint) {
  const rows = await prisma.eventCommissionLedger.groupBy({
    by: ["vendorId"],
    where: { organizationId, status: "pending" },
    _sum: { vendorNet: true },
    _count: { id: true },
  });

  const vendorIds = rows.map((r) => r.vendorId);
  const vendors = await prisma.eventVendor.findMany({
    where: { id: { in: vendorIds }, organizationId },
    select: { id: true, vendorName: true },
  });
  const nameById = new Map(vendors.map((v) => [v.id.toString(), v.vendorName]));

  return rows.map((r) => ({
    vendorId: r.vendorId.toString(),
    vendorName: nameById.get(r.vendorId.toString()) ?? "Vendor",
    pendingAmount: r._sum.vendorNet?.toString() ?? "0",
    entryCount: r._count.id,
  }));
}
