import "server-only";

import { Prisma } from "@prisma/client";

import {
  EVENT_EXPENSE_CATEGORY_LABELS,
  EVENT_REVENUE_CATEGORY_LABELS,
  EXPENSE_ACTUAL_STATUSES,
  REVENUE_ACTUAL_STATUSES,
  REVENUE_PENDING_STATUSES,
  type EventExpenseCategory,
} from "@/lib/event-platform/event-financials/event-financials-constants";
import type {
  CreateEventExpenseInput,
  CreateEventRevenueInput,
  EventBreakEven,
  EventFinancialAmountBucket,
  EventFinancialForecast,
  EventFinancialLineDto,
  EventFinancialsOverview,
} from "@/lib/event-platform/event-financials/event-financials-types";
import { filterValidRegistrations } from "@/lib/event-platform/command-center/command-center-registration";
import { csvRow } from "@/lib/event-platform/export/csv-utils";
import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import { prisma } from "@/lib/prisma";

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function bucket(actual: number, pending: number, projected = 0): EventFinancialAmountBucket {
  return { actual: round2(actual), pending: round2(pending), projected: round2(projected) };
}

function margin(net: number, gross: number): number | null {
  if (gross <= 0) return null;
  return round2((net / gross) * 100);
}

function isBonusTicket(ticket: { name: string; description: string | null } | null | undefined): boolean {
  if (!ticket) return false;
  const n = ticket.name.toLowerCase();
  const d = (ticket.description ?? "").toLowerCase();
  return n.includes("bonus") || d.includes("bonus card") || n.includes("extra card");
}

function expenseCategoryLabel(cat: string): string {
  return EVENT_EXPENSE_CATEGORY_LABELS[cat as EventExpenseCategory] ?? cat.replace(/_/g, " ");
}

function revenueCategoryLabel(cat: string): string {
  return EVENT_REVENUE_CATEGORY_LABELS[cat as keyof typeof EVENT_REVENUE_CATEGORY_LABELS] ?? cat.replace(/_/g, " ");
}

function lineBucket(
  recordType: "revenue" | "expense",
  status: string,
  txStatus?: string,
): "actual" | "pending" | "projected" {
  if (recordType === "revenue") {
    if (REVENUE_ACTUAL_STATUSES.has(status) || REVENUE_ACTUAL_STATUSES.has(txStatus ?? "")) return "actual";
    if (REVENUE_PENDING_STATUSES.has(status) || status === "pending") return "pending";
    if (status === "refunded") return "actual";
    return "pending";
  }
  if (EXPENSE_ACTUAL_STATUSES.has(status)) return "actual";
  if (status === "draft") return "projected";
  return "pending";
}

export async function getEventFinancialsOverview(
  organizationId: bigint,
  eventIdRaw: string,
  options?: { canManageFinancials?: boolean },
): Promise<EventFinancialsOverview | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: { id: true, currency: true, startsAt: true, capacity: true },
  });
  if (!event) return null;

  const [transactions, tickets, registrations, expenses, revenueEntries, commissions, plants, lockRow, priorEvents] =
    await Promise.all([
      prisma.lmsEventTransaction.findMany({
        where: { organizationId, eventId },
        orderBy: { processedAt: "desc" },
      }),
      prisma.lmsEventTicket.findMany({ where: { organizationId, eventId } }),
      prisma.lmsEventRegistration.findMany({
        where: { organizationId, eventId },
        select: { bookingStatus: true, paymentStatus: true, registeredAt: true },
      }),
      prisma.eventExpense.findMany({ where: { organizationId, eventId }, orderBy: { createdAt: "desc" } }),
      prisma.eventRevenueEntry.findMany({ where: { organizationId, eventId }, orderBy: { createdAt: "desc" } }),
      prisma.eventCommissionLedger.findMany({
        where: { organizationId, eventId },
        include: { vendor: { select: { vendorName: true } } },
      }),
      prisma.eventPlant.findMany({
        where: { organizationId, eventId, status: { not: "removed" } },
      }),
      prisma.eventFinancialLock.findUnique({
        where: { eventId },
        include: { lockedBy: { select: { name: true } } },
      }),
      prisma.lmsTrainingEvent.findMany({
        where: {
          organizationId,
          id: { not: eventId },
          status: { in: ["completed", "published", "live"] },
        },
        select: { id: true, title: true, startsAt: true },
        orderBy: { startsAt: "desc" },
        take: 5,
      }),
    ]);

  const currency = event.currency || "USD";
  const validRegs = filterValidRegistrations(registrations);
  const attendeeCount = validRegs.length;

  const bonusTicketIds = new Set(tickets.filter((t) => isBonusTicket(t)).map((t) => t.id.toString()));
  const primaryTickets = tickets.filter((t) => !isBonusTicket(t));
  const bonusTickets = tickets.filter((t) => isBonusTicket(t));

  const storedExpenseSourceIds = new Set(
    expenses.filter((e) => e.sourceType && e.sourceId).map((e) => `${e.sourceType}:${e.sourceId}`),
  );

  const lines: EventFinancialLineDto[] = [];

  const regTicketMap = new Map(
    (
      await prisma.lmsEventRegistration.findMany({
        where: { organizationId, eventId },
        select: { id: true, ticketId: true },
      })
    ).map((r) => [r.id.toString(), r.ticketId?.toString() ?? null]),
  );

  for (const tx of transactions) {
    const ticketId = regTicketMap.get(tx.registrationId.toString());
    const isBonus = ticketId != null && bonusTicketIds.has(ticketId);
    const isRefund = tx.status === "refunded";
    const amount = num(tx.amount);
    const category = isRefund ? "refunds" : isBonus ? "bonus_card_sales" : "ticket_sales";
    lines.push({
      id: `tx-${tx.id}`,
      recordType: isRefund ? "expense" : "revenue",
      category,
      categoryLabel: isRefund ? "Refunds" : revenueCategoryLabel(category),
      payeeName: tx.attendeeName,
      description: `${tx.method} payment`,
      quantity: 1,
      unitCost: amount,
      subtotal: amount,
      tax: 0,
      total: isRefund ? amount : amount,
      paymentStatus: tx.status,
      dueDate: null,
      paidDate: tx.processedAt.toISOString(),
      receiptUrl: null,
      source: isRefund ? "refund" : isBonus ? "bonus_card_sale" : "ticket_transaction",
      sourceLabel: isRefund ? "Refund" : isBonus ? "Bonus Card Sale" : "Ticket Transaction",
      notes: null,
      editable: false,
      bucket: lineBucket(isRefund ? "expense" : "revenue", tx.status),
      linkedExpenseId: null,
      linkedRevenueId: null,
      linkedTransactionId: tx.id.toString(),
    });
  }

  for (const rev of revenueEntries) {
    lines.push({
      id: `rev-${rev.id}`,
      recordType: "revenue",
      category: rev.category,
      categoryLabel: revenueCategoryLabel(rev.category),
      payeeName: rev.payeeName,
      description: rev.description,
      quantity: 1,
      unitCost: num(rev.amount),
      subtotal: num(rev.amount),
      tax: 0,
      total: num(rev.amount),
      paymentStatus: rev.paymentStatus,
      dueDate: null,
      paidDate: rev.receivedAt?.toISOString() ?? null,
      receiptUrl: null,
      source: rev.sourceType ?? "manual_revenue",
      sourceLabel: "Manual Revenue",
      notes: rev.notes,
      editable: true,
      bucket: lineBucket("revenue", rev.paymentStatus),
      linkedExpenseId: null,
      linkedRevenueId: rev.id.toString(),
      linkedTransactionId: null,
    });
  }

  for (const exp of expenses) {
    lines.push({
      id: `exp-${exp.id}`,
      recordType: "expense",
      category: exp.category,
      categoryLabel: expenseCategoryLabel(exp.category),
      payeeName: exp.payeeName,
      description: exp.description,
      quantity: num(exp.quantity),
      unitCost: num(exp.unitCost),
      subtotal: num(exp.subtotal),
      tax: num(exp.tax),
      total: num(exp.total),
      paymentStatus: exp.paymentStatus,
      dueDate: exp.dueDate?.toISOString() ?? null,
      paidDate: exp.paidAt?.toISOString() ?? null,
      receiptUrl: exp.receiptUrl,
      source: exp.sourceType ?? "manual_expense",
      sourceLabel: exp.accountingExpenseId ? "Accounting Expense" : "Manual Expense",
      notes: exp.notes,
      editable: true,
      bucket: lineBucket("expense", exp.paymentStatus),
      linkedExpenseId: exp.id.toString(),
      linkedRevenueId: null,
      linkedTransactionId: null,
    });
  }

  const plantTotal = plants.reduce((s, p) => s + num(p.unitCost) * p.quantityPurchased, 0);
  const plantKey = `plant_inventory:${eventId.toString()}`;
  if (plantTotal > 0 && !storedExpenseSourceIds.has(plantKey)) {
    lines.push({
      id: `derived-plants`,
      recordType: "expense",
      category: "plants",
      categoryLabel: "Plants",
      payeeName: null,
      description: "Plant inventory cost (derived)",
      quantity: 1,
      unitCost: plantTotal,
      subtotal: plantTotal,
      tax: 0,
      total: plantTotal,
      paymentStatus: "approved",
      dueDate: null,
      paidDate: null,
      receiptUrl: null,
      source: "plant_inventory",
      sourceLabel: "Plant Inventory",
      notes: "Auto-calculated from event plant inventory",
      editable: false,
      bucket: "actual",
      linkedExpenseId: null,
      linkedRevenueId: null,
      linkedTransactionId: null,
    });
  }

  for (const comm of commissions) {
    const key = `commission_ledger:${comm.id.toString()}`;
    if (storedExpenseSourceIds.has(key)) continue;
    const amount = num(comm.vendorNet);
    if (amount <= 0) continue;
    lines.push({
      id: `comm-${comm.id}`,
      recordType: "expense",
      category: "affiliates",
      categoryLabel: "Affiliates",
      payeeName: comm.vendor.vendorName,
      description: "Vendor commission",
      quantity: 1,
      unitCost: amount,
      subtotal: amount,
      tax: 0,
      total: amount,
      paymentStatus: comm.status === "paid" ? "paid" : "pending",
      dueDate: null,
      paidDate: comm.paidAt?.toISOString() ?? null,
      receiptUrl: null,
      source: "commission",
      sourceLabel: "Commission",
      notes: null,
      editable: false,
      bucket: comm.status === "paid" ? "actual" : "pending",
      linkedExpenseId: null,
      linkedRevenueId: null,
      linkedTransactionId: comm.transactionId?.toString() ?? null,
    });
  }

  let grossActual = 0;
  let grossPending = 0;
  let expenseActual = 0;
  let expensePending = 0;
  let expenseProjected = 0;
  let orderCount = 0;

  for (const line of lines) {
    if (line.recordType === "revenue" && line.category !== "refunds") {
      if (line.bucket === "actual") grossActual += line.total;
      else grossPending += line.total;
      if (line.source === "ticket_transaction" || line.source === "bonus_card_sale") orderCount += 1;
    } else if (line.recordType === "expense" || line.category === "refunds") {
      if (line.bucket === "actual") expenseActual += line.total;
      else if (line.bucket === "projected") expenseProjected += line.total;
      else expensePending += line.total;
    }
  }

  const grossRevenue = bucket(grossActual, grossPending);
  const totalExpenses = bucket(expenseActual, expensePending, expenseProjected);
  const netActual = grossActual - expenseActual;
  const netPending = grossPending - expensePending;
  const netProjected = grossActual + grossPending - expenseActual - expensePending - expenseProjected;

  const summary = {
    grossRevenue,
    totalExpenses,
    netProfit: bucket(netActual, netPending, netProjected),
    profitMargin: bucket(margin(netActual, grossActual) ?? 0, margin(netPending, grossPending) ?? 0, margin(netProjected, grossActual + grossPending) ?? 0),
    revenuePerAttendee: attendeeCount > 0 ? round2(grossActual / attendeeCount) : null,
    costPerAttendee: attendeeCount > 0 ? round2(expenseActual / attendeeCount) : null,
    averageOrderValue: orderCount > 0 ? round2(grossActual / orderCount) : null,
    outstandingPayments: validRegs.filter((r) => r.paymentStatus === "unpaid" || r.paymentStatus === "pending").length,
    currency,
    validAttendeeCount: attendeeCount,
    orderCount,
  };

  const breakEvenRevenue = expenseActual + expensePending + expenseProjected;
  const avgTicketPrice =
    primaryTickets.length > 0
      ? primaryTickets.reduce((s, t) => s + num(t.price), 0) / primaryTickets.length
      : null;
  const avgBonusPrice =
    bonusTickets.length > 0 ? bonusTickets.reduce((s, t) => s + num(t.price), 0) / bonusTickets.length : null;
  const remaining = Math.max(0, breakEvenRevenue - grossActual);

  const breakEven: EventBreakEven = {
    breakEvenRevenue: round2(breakEvenRevenue),
    currentCollectedRevenue: round2(grossActual),
    amountAboveOrBelow: round2(grossActual - breakEvenRevenue),
    ticketsNeeded: avgTicketPrice && avgTicketPrice > 0 ? Math.ceil(remaining / avgTicketPrice) : null,
    bonusCardsNeeded: avgBonusPrice && avgBonusPrice > 0 ? Math.ceil(remaining / avgBonusPrice) : null,
    avgNetTicketRevenue: avgTicketPrice != null ? round2(avgTicketPrice) : null,
    netBonusCardPrice: avgBonusPrice != null ? round2(avgBonusPrice) : null,
  };

  const daysUntilEvent = Math.max(
    1,
    Math.ceil((event.startsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  const regPerDay = attendeeCount / Math.max(1, Math.ceil((Date.now() - event.startsAt.getTime() + daysUntilEvent * 86400000) / 86400000) || 1);
  const projectedAttendees = Math.min(
    event.capacity ?? attendeeCount + Math.round(regPerDay * daysUntilEvent),
    Math.round(attendeeCount + regPerDay * daysUntilEvent),
  );
  const projectedTicketRev =
    avgTicketPrice != null ? round2(projectedAttendees * avgTicketPrice * 0.85) : round2(grossActual * 1.1);
  const projectedBonusRev = round2(grossActual * 0.15);
  const projectedExpenses = round2(breakEvenRevenue);
  const projectedNet = round2(projectedTicketRev + projectedBonusRev - projectedExpenses);

  const forecast: EventFinancialForecast = {
    projectedAttendees: Math.max(attendeeCount, projectedAttendees),
    projectedTicketRevenue: projectedTicketRev,
    projectedBonusCardRevenue: projectedBonusRev,
    projectedExpenses,
    projectedNetProfit: projectedNet,
    projectedMargin: margin(projectedNet, projectedTicketRev + projectedBonusRev),
    label: "Estimate based on current registration pace — not a guarantee",
  };

  const expenseByCategory = new Map<string, number>();
  const revenueBySource = new Map<string, number>();
  for (const line of lines) {
    if (line.recordType === "expense" && line.bucket !== "projected") {
      expenseByCategory.set(line.categoryLabel, (expenseByCategory.get(line.categoryLabel) ?? 0) + line.total);
    }
    if (line.recordType === "revenue" && line.bucket === "actual") {
      revenueBySource.set(line.sourceLabel, (revenueBySource.get(line.sourceLabel) ?? 0) + line.total);
    }
  }

  const profitVsPrevious: EventFinancialsOverview["analytics"]["profitVsPreviousEvents"] = [];
  for (const pe of priorEvents) {
    const peTx = await prisma.lmsEventTransaction.findMany({
      where: { organizationId, eventId: pe.id, status: "completed" },
      select: { amount: true },
    });
    const peRev = peTx.reduce((s, t) => s + num(t.amount), 0);
    const peExp = await prisma.eventExpense.findMany({
      where: { organizationId, eventId: pe.id, paymentStatus: { in: [...EXPENSE_ACTUAL_STATUSES] } },
      select: { total: true },
    });
    const peExpTotal = peExp.reduce((s, e) => s + num(e.total), 0);
    profitVsPrevious.push({
      label: pe.title.length > 20 ? `${pe.title.slice(0, 20)}…` : pe.title,
      netProfit: round2(peRev - peExpTotal),
    });
  }
  profitVsPrevious.unshift({ label: "This event", netProfit: netActual });

  const analytics: EventFinancialsOverview["analytics"] = {
    revenueVsExpenses: [
      { label: "Actual", revenue: grossActual, expenses: expenseActual },
      { label: "Pending", revenue: grossPending, expenses: expensePending },
      { label: "Projected", revenue: forecast.projectedTicketRevenue + forecast.projectedBonusCardRevenue, expenses: expenseProjected },
    ],
    expenseByCategory: [...expenseByCategory.entries()].map(([label, amount]) => ({
      key: label,
      label,
      amount: round2(amount),
    })),
    revenueBySource: [...revenueBySource.entries()].map(([label, amount]) => ({
      key: label,
      label,
      amount: round2(amount),
    })),
    profitVsPreviousEvents: profitVsPrevious,
    actualVsProjected: {
      actualNet: netActual,
      projectedNet: projectedNet,
      actualRevenue: grossActual,
      projectedRevenue: projectedTicketRev + projectedBonusRev,
    },
    breakEvenProgress: {
      collected: grossActual,
      breakEven: breakEvenRevenue,
      percent: breakEvenRevenue > 0 ? Math.min(100, round2((grossActual / breakEvenRevenue) * 100)) : 0,
    },
  };

  return {
    summary,
    lines,
    breakEven,
    forecast,
    analytics,
    lock: {
      locked: lockRow?.locked ?? false,
      lockedAt: lockRow?.lockedAt?.toISOString() ?? null,
      lockedByName: lockRow?.lockedBy?.name ?? null,
    },
    canManageFinancials: options?.canManageFinancials ?? false,
  };
}

function calcExpenseTotals(input: CreateEventExpenseInput): {
  quantity: number;
  unitCost: number;
  subtotal: number;
  tax: number;
  total: number;
} {
  const quantity = Math.max(0, input.quantity ?? 1);
  const unitCost = Math.max(0, input.unitCost ?? 0);
  const subtotal = round2(quantity * unitCost);
  const tax = Math.max(0, input.tax ?? 0);
  return { quantity, unitCost, subtotal, tax, total: round2(subtotal + tax) };
}

export async function createEventExpense(input: {
  organizationId: bigint;
  eventId: bigint;
  data: CreateEventExpenseInput;
  actorUserId?: bigint;
}): Promise<{ id: string } | null> {
  const totals = calcExpenseTotals(input.data);
  const row = await prisma.eventExpense.create({
    data: {
      organizationId: input.organizationId,
      eventId: input.eventId,
      category: input.data.category,
      payeeType: input.data.payeeType ?? null,
      payeeName: input.data.payeeName?.trim() || null,
      description: input.data.description?.trim() || null,
      quantity: totals.quantity,
      unitCost: totals.unitCost,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      paymentStatus: input.data.paymentStatus ?? "pending",
      dueDate: input.data.dueDate ? new Date(input.data.dueDate) : null,
      paidAt: input.data.paidAt ? new Date(input.data.paidAt) : null,
      receiptUrl: input.data.receiptUrl?.trim() || null,
      notes: input.data.notes?.trim() || null,
      sourceType: "manual_expense",
      createdById: input.actorUserId ?? null,
      updatedById: input.actorUserId ?? null,
    },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "financial.expense_added",
    entityType: "event_expense",
    entityId: row.id.toString(),
    metadata: { eventId: input.eventId.toString() },
  });

  return { id: row.id.toString() };
}

export async function updateEventExpense(input: {
  organizationId: bigint;
  eventId: bigint;
  expenseId: bigint;
  data: Partial<CreateEventExpenseInput>;
  actorUserId?: bigint;
}): Promise<boolean> {
  const existing = await prisma.eventExpense.findFirst({
    where: { id: input.expenseId, organizationId: input.organizationId, eventId: input.eventId },
  });
  if (!existing) return false;

  const merged: CreateEventExpenseInput = {
    category: input.data.category ?? existing.category,
    quantity: input.data.quantity ?? num(existing.quantity),
    unitCost: input.data.unitCost ?? num(existing.unitCost),
    tax: input.data.tax ?? num(existing.tax),
    payeeName: input.data.payeeName ?? existing.payeeName,
    description: input.data.description ?? existing.description,
    paymentStatus: input.data.paymentStatus ?? existing.paymentStatus,
    dueDate: input.data.dueDate !== undefined ? input.data.dueDate : existing.dueDate?.toISOString() ?? null,
    paidAt: input.data.paidAt !== undefined ? input.data.paidAt : existing.paidAt?.toISOString() ?? null,
    receiptUrl: input.data.receiptUrl ?? existing.receiptUrl,
    notes: input.data.notes ?? existing.notes,
  };
  const totals = calcExpenseTotals(merged);

  await prisma.eventExpense.update({
    where: { id: existing.id },
    data: {
      category: merged.category,
      payeeName: merged.payeeName?.trim() || null,
      description: merged.description?.trim() || null,
      quantity: totals.quantity,
      unitCost: totals.unitCost,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      paymentStatus: merged.paymentStatus ?? existing.paymentStatus,
      dueDate: merged.dueDate ? new Date(merged.dueDate) : null,
      paidAt: merged.paidAt ? new Date(merged.paidAt) : null,
      receiptUrl: merged.receiptUrl?.trim() || null,
      notes: merged.notes?.trim() || null,
      updatedById: input.actorUserId ?? null,
    },
  });

  return true;
}

export async function approveEventExpense(input: {
  organizationId: bigint;
  eventId: bigint;
  expenseId: bigint;
  actorUserId?: bigint;
}): Promise<boolean> {
  const existing = await prisma.eventExpense.findFirst({
    where: { id: input.expenseId, organizationId: input.organizationId, eventId: input.eventId },
  });
  if (!existing) return false;

  await prisma.eventExpense.update({
    where: { id: existing.id },
    data: {
      paymentStatus: "approved",
      approvedById: input.actorUserId ?? null,
      updatedById: input.actorUserId ?? null,
    },
  });
  return true;
}

export async function markEventExpensePaid(input: {
  organizationId: bigint;
  eventId: bigint;
  expenseId: bigint;
  actorUserId?: bigint;
}): Promise<boolean> {
  const existing = await prisma.eventExpense.findFirst({
    where: { id: input.expenseId, organizationId: input.organizationId, eventId: input.eventId },
  });
  if (!existing) return false;

  await prisma.eventExpense.update({
    where: { id: existing.id },
    data: {
      paymentStatus: "paid",
      paidAt: new Date(),
      updatedById: input.actorUserId ?? null,
    },
  });
  return true;
}

export async function createEventRevenueEntry(input: {
  organizationId: bigint;
  eventId: bigint;
  data: CreateEventRevenueInput;
  actorUserId?: bigint;
}): Promise<{ id: string } | null> {
  const amount = Math.max(0, input.data.amount);
  if (amount <= 0) return null;

  const row = await prisma.eventRevenueEntry.create({
    data: {
      organizationId: input.organizationId,
      eventId: input.eventId,
      category: input.data.category,
      payeeName: input.data.payeeName?.trim() || null,
      description: input.data.description?.trim() || null,
      amount,
      paymentStatus: input.data.paymentStatus ?? "paid",
      receivedAt: input.data.receivedAt ? new Date(input.data.receivedAt) : new Date(),
      sourceType: "manual_revenue",
      notes: input.data.notes?.trim() || null,
      createdById: input.actorUserId ?? null,
      updatedById: input.actorUserId ?? null,
    },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: "financial.revenue_added",
    entityType: "event_revenue_entry",
    entityId: row.id.toString(),
    metadata: { eventId: input.eventId.toString() },
  });

  return { id: row.id.toString() };
}

export async function setEventFinancialLock(input: {
  organizationId: bigint;
  eventId: bigint;
  locked: boolean;
  actorUserId?: bigint;
  notes?: string | null;
}): Promise<boolean> {
  await prisma.eventFinancialLock.upsert({
    where: { eventId: input.eventId },
    create: {
      organizationId: input.organizationId,
      eventId: input.eventId,
      locked: input.locked,
      lockedAt: input.locked ? new Date() : null,
      lockedById: input.locked ? (input.actorUserId ?? null) : null,
      unlockedAt: input.locked ? null : new Date(),
      notes: input.notes ?? null,
    },
    update: {
      locked: input.locked,
      lockedAt: input.locked ? new Date() : undefined,
      lockedById: input.locked ? (input.actorUserId ?? null) : undefined,
      unlockedAt: input.locked ? null : new Date(),
      notes: input.notes ?? undefined,
      updatedAt: new Date(),
    },
  });

  await writeEventAuditLog({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    action: input.locked ? "financial.locked" : "financial.unlocked",
    entityType: "event_financial_lock",
    entityId: input.eventId.toString(),
  });

  return true;
}

export async function isEventFinancialsLocked(organizationId: bigint, eventId: bigint): Promise<boolean> {
  const row = await prisma.eventFinancialLock.findFirst({
    where: { organizationId, eventId, locked: true },
  });
  return Boolean(row);
}

export function eventFinancialsToCsv(lines: EventFinancialLineDto[]): string {
  const headers = [
    "Type",
    "Category",
    "Payee",
    "Description",
    "Quantity",
    "Unit Cost",
    "Subtotal",
    "Tax",
    "Total",
    "Status",
    "Source",
    "Bucket",
  ];
  const rows = lines.map((l) =>
    [
      l.recordType,
      l.categoryLabel,
      l.payeeName ?? "",
      l.description ?? "",
      String(l.quantity),
      String(l.unitCost),
      String(l.subtotal),
      String(l.tax),
      String(l.total),
      l.paymentStatus,
      l.sourceLabel,
      l.bucket,
    ].join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function eventFinancialsSummaryToCsv(overview: EventFinancialsOverview): string {
  const s = overview.summary;
  const b = overview.breakEven;
  const rows: unknown[][] = [
    ["Gross revenue (actual)", s.grossRevenue.actual],
    ["Gross revenue (pending)", s.grossRevenue.pending],
    ["Total expenses (actual)", s.totalExpenses.actual],
    ["Total expenses (pending)", s.totalExpenses.pending],
    ["Net profit (actual)", s.netProfit.actual],
    ["Profit margin % (actual)", s.profitMargin.actual],
    ["Break-even revenue", b.breakEvenRevenue],
    ["Collected revenue", b.currentCollectedRevenue],
    ["Above/below break-even", b.amountAboveOrBelow],
    ["Outstanding payments", s.outstandingPayments],
    ["Valid attendees", s.validAttendeeCount],
  ];
  return ["Metric,Value", ...rows.map((r) => csvRow(r))].join("\n");
}

export async function getEventExpenseTotals(
  organizationId: bigint,
  eventId: bigint,
): Promise<{ actual: number; pending: number }> {
  const expenses = await prisma.eventExpense.findMany({
    where: { organizationId, eventId },
    select: { total: true, paymentStatus: true },
  });
  let actual = 0;
  let pending = 0;
  for (const e of expenses) {
    const t = num(e.total);
    if (EXPENSE_ACTUAL_STATUSES.has(e.paymentStatus)) actual += t;
    else pending += t;
  }
  return { actual: round2(actual), pending: round2(pending) };
}
