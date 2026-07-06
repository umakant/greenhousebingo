import "server-only";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

async function nextExpenseRef(organizationId: bigint): Promise<string> {
  const count = await prisma.expense.count({ where: { createdBy: organizationId } });
  return `EXP-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Mirror an instructor commission accrual into accounting `expenses` (category: lms_commission).
 */
export async function syncInstructorCommissionToExpense(params: {
  commissionId: bigint;
  organizationId: bigint;
}): Promise<bigint | null> {
  const row = await prisma.lmsInstructorCommission.findFirst({
    where: { id: params.commissionId, organizationId: params.organizationId },
    include: {
      instructorProfile: { select: { displayName: true, user: { select: { name: true } } } },
      course: { select: { title: true } },
      revenueRecord: { select: { storefrontOrderId: true } },
    },
  });
  if (!row || row.accountingExpenseId) return row?.accountingExpenseId ?? null;

  const ref = `ICM-${row.id.toString()}`;
  const existing = await prisma.expense.findFirst({
    where: { referenceNumber: ref, createdBy: params.organizationId },
    select: { id: true },
  });
  if (existing) {
    await prisma.lmsInstructorCommission.update({
      where: { id: row.id },
      data: { accountingExpenseId: existing.id, updatedAt: new Date() },
    });
    return existing.id;
  }

  const instructorName =
    row.instructorProfile.displayName?.trim() ||
    row.instructorProfile.user?.name?.trim() ||
    "Instructor";

  const expense = await prisma.expense.create({
    data: {
      referenceNumber: ref,
      date: new Date(),
      amount: new Prisma.Decimal(row.commissionAmount),
      category: "lms_commission",
      description: `LMS commission: ${instructorName} — ${row.course.title} (${row.commissionPercent}%)`,
      paymentMethod: "accrual",
      status: "pending",
      notes: `lms_instructor_commissions.id=${row.id.toString()}`,
      createdBy: params.organizationId,
    },
  });

  await prisma.lmsInstructorCommission.update({
    where: { id: row.id },
    data: { accountingExpenseId: expense.id, updatedAt: new Date() },
  });

  return expense.id;
}

/** Batch payout placeholder → single pending expense in accounting. */
export async function syncInstructorPayoutToExpense(params: {
  payoutId: bigint;
  organizationId: bigint;
}): Promise<bigint | null> {
  const payout = await prisma.lmsInstructorPayout.findFirst({
    where: { id: params.payoutId, organizationId: params.organizationId },
    include: {
      instructorProfile: { select: { displayName: true, user: { select: { name: true } } } },
    },
  });
  if (!payout || payout.accountingExpenseId) return payout?.accountingExpenseId ?? null;

  const ref = `IPAY-${payout.id.toString()}`;
  const existing = await prisma.expense.findFirst({
    where: { referenceNumber: ref, createdBy: params.organizationId },
    select: { id: true },
  });
  if (existing) {
    await prisma.lmsInstructorPayout.update({
      where: { id: payout.id },
      data: { accountingExpenseId: existing.id, updatedAt: new Date() },
    });
    return existing.id;
  }

  const name =
    payout.instructorProfile.displayName?.trim() ||
    payout.instructorProfile.user?.name?.trim() ||
    "Instructor";

  const expense = await prisma.expense.create({
    data: {
      referenceNumber: ref,
      date: payout.paidAt ?? new Date(),
      amount: new Prisma.Decimal(payout.totalAmount),
      category: "lms_instructor_payout",
      description: `LMS instructor payout (placeholder): ${name}`,
      paymentMethod: "manual",
      status: payout.status === "PAID" ? "completed" : "pending",
      notes: `lms_instructor_payouts.id=${payout.id.toString()}`,
      createdBy: params.organizationId,
    },
  });

  await prisma.lmsInstructorPayout.update({
    where: { id: payout.id },
    data: { accountingExpenseId: expense.id, updatedAt: new Date() },
  });

  return expense.id;
}
