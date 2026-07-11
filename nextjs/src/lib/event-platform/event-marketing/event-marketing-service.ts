import "server-only";

import type { Prisma } from "@prisma/client";

import { isCommandCenterValidRegistration } from "@/lib/event-platform/command-center/command-center-registration";
import { isBonusTicketRow } from "@/lib/event-platform/attendees/event-attendees-helpers";
import { buildAffiliateRedirectUrl } from "@/lib/affiliate-link-utils";
import {
  ATTRIBUTION_RULE_DESCRIPTION,
  REGISTRATION_SOURCE_LABELS,
} from "@/lib/event-platform/event-marketing/attribution-constants";
import { resolveRegistrationAttribution } from "@/lib/event-platform/event-marketing/attribution-resolver";
import type {
  EventMarketingAffiliateRow,
  EventMarketingChartPoint,
  EventMarketingFilters,
  EventMarketingOverview,
  EventMarketingPromotionRow,
  EventMarketingSourceRow,
  EventMarketingSummary,
  MarketingMetricValue,
} from "@/lib/event-platform/event-marketing/event-marketing-types";
import { EXPENSE_ACTUAL_STATUSES } from "@/lib/event-platform/event-financials/event-financials-constants";
import { writeEventAuditLog } from "@/lib/event-platform/dashboard-service";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import { parseDetailContent, type LmsEventDetailSponsor } from "@/lib/lms-events/event-detail-content";
import { prisma } from "@/lib/prisma";

function num(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function safeDivide(n: number, d: number): number | null {
  if (d <= 0) return null;
  return round2(n / d);
}

function metricValue(value: number | null, notAvailable = false): MarketingMetricValue {
  return { value, notAvailable, label: notAvailable ? "Not Available" : undefined };
}

type EnrichedReg = {
  id: string;
  registeredAt: Date;
  checkedInAt: Date | null;
  ticketId: string | null;
  attendeeEmail: string;
  affiliatePartnerId: bigint | null;
  couponCode: string | null;
  ticketRevenue: number;
  bonusRevenue: number;
  totalRevenue: number;
  resolvedSource: ReturnType<typeof resolveRegistrationAttribution>;
  hasAttributionFields: boolean;
};

function regHasAttributionFields(row: {
  registrationSource: string | null;
  affiliatePartnerId: bigint | null;
  referralCode: string | null;
  couponCode: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
}): boolean {
  return Boolean(
    row.registrationSource?.trim() ||
      row.affiliatePartnerId ||
      row.referralCode?.trim() ||
      row.couponCode?.trim() ||
      row.utmSource?.trim() ||
      row.utmCampaign?.trim(),
  );
}

function applyFilters(regs: EnrichedReg[], filters: EventMarketingFilters): EnrichedReg[] {
  let result = regs;
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    if (Number.isFinite(from)) result = result.filter((r) => r.registeredAt.getTime() >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo).getTime();
    if (Number.isFinite(to)) result = result.filter((r) => r.registeredAt.getTime() <= to);
  }
  if (filters.source && filters.source !== "all") {
    result = result.filter((r) => r.resolvedSource.sourceType === filters.source);
  }
  if (filters.campaign?.trim()) {
    const c = filters.campaign.trim().toLowerCase();
    result = result.filter((r) => (r.resolvedSource.campaign ?? "").toLowerCase().includes(c));
  }
  if (filters.affiliateId?.trim()) {
    result = result.filter((r) => r.affiliatePartnerId?.toString() === filters.affiliateId);
  }
  if (filters.promotionCode?.trim()) {
    const code = filters.promotionCode.trim().toLowerCase();
    result = result.filter(
      (r) =>
        (r.couponCode ?? "").toLowerCase() === code ||
        (r.resolvedSource.promotionCode ?? "").toLowerCase() === code,
    );
  }
  if (filters.checkInStatus === "checked_in") result = result.filter((r) => r.checkedInAt != null);
  else if (filters.checkInStatus === "not_checked_in") result = result.filter((r) => !r.checkedInAt);
  if (filters.ticketTierId?.trim()) result = result.filter((r) => r.ticketId === filters.ticketTierId);
  return result;
}

export async function getEventMarketingOverview(
  organizationId: bigint,
  eventIdRaw: string,
  options?: { canManage?: boolean; filters?: EventMarketingFilters },
): Promise<EventMarketingOverview | null> {
  let eventId: bigint;
  try {
    eventId = BigInt(eventIdRaw);
  } catch {
    return null;
  }

  const filters = options?.filters ?? {};
  const event = await prisma.lmsTrainingEvent.findFirst({
    where: { id: eventId, organizationId },
    select: { id: true, title: true, slug: true, currency: true, detailContent: true },
  });
  if (!event) return null;

  const detail = parseDetailContent(event.detailContent);
  const currency = event.currency || "USD";

  const [registrations, tickets, transactions, promoExpenses, affiliates, links, commissions, coupons, sponsors, revenueEntries] =
    await Promise.all([
      prisma.lmsEventRegistration.findMany({
        where: { organizationId, eventId },
        select: {
          id: true,
          registeredAt: true,
          checkedInAt: true,
          ticketId: true,
          attendeeEmail: true,
          bookingStatus: true,
          affiliatePartnerId: true,
          affiliateLinkId: true,
          referralCode: true,
          couponId: true,
          couponCode: true,
          registrationSource: true,
          sourceName: true,
          campaignId: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
        },
      }),
      prisma.lmsEventTicket.findMany({ where: { organizationId, eventId } }),
      prisma.lmsEventTransaction.findMany({
        where: { organizationId, eventId, status: { in: ["completed", "paid"] } },
        select: { registrationId: true, amount: true, method: true },
      }),
      prisma.eventExpense.findMany({
        where: { organizationId, eventId, category: "promotions", paymentStatus: { in: [...EXPENSE_ACTUAL_STATUSES] } },
      }),
      prisma.affiliatePartner.findMany({ where: { organizationId, status: "active" } }),
      prisma.affiliateLink.findMany({
        where: { organizationId, status: "active" },
        include: { program: { select: { commissionType: true, commissionValue: true } } },
      }),
      prisma.affiliateCommission.findMany({ where: { organizationId } }),
      prisma.coupon.findMany({ take: 500, orderBy: { createdAt: "desc" } }),
      prisma.eventSponsor.findMany({ where: { organizationId, status: "active" } }),
      prisma.eventRevenueEntry.findMany({ where: { organizationId, eventId, category: "sponsor_revenue" } }),
    ]);

  const partnerByCode = new Map(affiliates.map((p) => [p.referralCode.toLowerCase(), p]));
  const ticketMap = new Map(tickets.map((t) => [t.id.toString(), t]));
  const txByReg = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const key = tx.registrationId.toString();
    const list = txByReg.get(key) ?? [];
    list.push(tx);
    txByReg.set(key, list);
  }

  const enriched: EnrichedReg[] = [];
  for (const reg of registrations.filter((r) => isCommandCenterValidRegistration(r.bookingStatus))) {
    let affiliatePartnerId = reg.affiliatePartnerId;
    if (!affiliatePartnerId && reg.referralCode?.trim()) {
      const partner = partnerByCode.get(reg.referralCode.trim().toLowerCase());
      if (partner) affiliatePartnerId = partner.id;
    }

    const regTx = txByReg.get(reg.id.toString()) ?? [];
    const ticket = reg.ticketId ? ticketMap.get(reg.ticketId.toString()) ?? null : null;
    const isBonus = isBonusTicketRow(ticket);
    let ticketRevenue = 0;
    let bonusRevenue = 0;
    for (const tx of regTx) {
      const amt = num(tx.amount);
      if (isBonus) bonusRevenue += amt;
      else ticketRevenue += amt;
    }

    const resolvedSource = resolveRegistrationAttribution({
      ...reg,
      affiliatePartnerId,
      paymentMethod: regTx[0]?.method ?? null,
    });

    enriched.push({
      id: reg.id.toString(),
      registeredAt: reg.registeredAt,
      checkedInAt: reg.checkedInAt,
      ticketId: reg.ticketId?.toString() ?? null,
      attendeeEmail: reg.attendeeEmail,
      affiliatePartnerId,
      couponCode: reg.couponCode,
      ticketRevenue: round2(ticketRevenue),
      bonusRevenue: round2(bonusRevenue),
      totalRevenue: round2(ticketRevenue + bonusRevenue),
      resolvedSource,
      hasAttributionFields: regHasAttributionFields({ ...reg, affiliatePartnerId }),
    });
  }

  const filtered = applyFilters(enriched, filters);
  const totalAdSpend = round2(promoExpenses.reduce((s, e) => s + num(e.total), 0));
  const sources = buildSourceRows(filtered, promoExpenses, commissions, totalAdSpend);
  const affiliateRows = buildAffiliateRows(filtered, affiliates, links, commissions, event.slug);

  return {
    eventId: event.id.toString(),
    eventTitle: event.title,
    eventSlug: event.slug,
    canManage: options?.canManage ?? false,
    attributionRuleDescription: ATTRIBUTION_RULE_DESCRIPTION,
    filters,
    summary: buildSummary(filtered, totalAdSpend, currency),
    sources,
    affiliates: affiliateRows,
    promotions: buildPromotionRows(filtered, coupons),
    sponsor: buildSponsorPanel(detail?.sponsor, sponsors, revenueEntries),
    charts: buildCharts(filtered, sources, affiliateRows, totalAdSpend),
    dataQuality: {
      registrationsWithAttributionFields: enriched.filter((r) => r.hasAttributionFields).length,
      registrationsMissingAttribution: enriched.length - enriched.filter((r) => r.hasAttributionFields).length,
      message:
        enriched.length - enriched.filter((r) => r.hasAttributionFields).length > 0
          ? "Some registrations lack stored attribution — they appear as Unattributed until checkout captures UTM, affiliate, or promo data."
          : "All registrations have attribution metadata on file.",
    },
  };
}

function buildSummary(regs: EnrichedReg[], adSpend: number, currency: string): EventMarketingSummary {
  let attributed = 0;
  let organic = 0;
  let affiliate = 0;
  let venue = 0;
  let referral = 0;
  let promotion = 0;
  let unattributed = 0;
  let attributedRevenue = 0;
  let checkedIn = 0;

  for (const r of regs) {
    const st = r.resolvedSource.sourceType;
    if (r.resolvedSource.isAttributed) {
      attributed += 1;
      attributedRevenue += r.totalRevenue;
    }
    if (st === "organic" || st === "direct") organic += 1;
    if (st === "affiliate") affiliate += 1;
    if (st === "venue_website" || st === "venue_qr") venue += 1;
    if (st === "customer_referral") referral += 1;
    if (st === "promotion_code") promotion += 1;
    if (st === "unattributed") unattributed += 1;
    if (r.checkedInAt) checkedIn += 1;
  }

  const total = regs.length;
  const roas = adSpend > 0 ? safeDivide(attributedRevenue, adSpend) : null;

  return {
    totalRegistrations: total,
    attributedRegistrations: attributed,
    organicRegistrations: organic,
    affiliateRegistrations: affiliate,
    venueRegistrations: venue,
    referralRegistrations: referral,
    promotionCodeRegistrations: promotion,
    adSpend: adSpend > 0 ? metricValue(adSpend) : metricValue(null, true),
    costPerRegistration: adSpend > 0 && total > 0 ? metricValue(safeDivide(adSpend, total)!) : metricValue(null, adSpend <= 0),
    attributedRevenue: metricValue(round2(attributedRevenue)),
    returnOnAdSpend: roas != null ? metricValue(roas) : metricValue(null, true),
    conversionRate: total > 0 ? metricValue(round2((checkedIn / total) * 100)) : metricValue(null),
    currency,
    unattributedCount: unattributed,
  };
}

function buildSourceRows(
  regs: EnrichedReg[],
  promoExpenses: Array<{ payeeName: string | null; description: string | null; total: Prisma.Decimal }>,
  commissions: Array<{ amount: Prisma.Decimal; customerEmail: string | null }>,
  totalAdSpend: number,
): EventMarketingSourceRow[] {
  const map = new Map<string, EventMarketingSourceRow>();

  for (const r of regs) {
    const key = `${r.resolvedSource.sourceType}::${r.resolvedSource.campaign ?? ""}`;
    const cur =
      map.get(key) ??
      ({
        sourceType: r.resolvedSource.sourceType,
        sourceLabel: REGISTRATION_SOURCE_LABELS[r.resolvedSource.sourceType],
        campaign: r.resolvedSource.campaign,
        registrations: 0,
        checkedIn: 0,
        checkInRate: null,
        ticketRevenue: 0,
        bonusCardRevenue: 0,
        totalRevenue: 0,
        spend: null,
        costPerRegistration: null,
        commission: 0,
        netRevenue: 0,
        roi: null,
        spendKnown: false,
      } satisfies EventMarketingSourceRow);

    cur.registrations += 1;
    if (r.checkedInAt) cur.checkedIn += 1;
    cur.ticketRevenue = round2(cur.ticketRevenue + r.ticketRevenue);
    cur.bonusCardRevenue = round2(cur.bonusCardRevenue + r.bonusRevenue);
    cur.totalRevenue = round2(cur.totalRevenue + r.totalRevenue);
    map.set(key, cur);
  }

  for (const row of map.values()) {
    row.checkInRate = row.registrations > 0 ? round2((row.checkedIn / row.registrations) * 100) : null;
    const emails = new Set(
      regs
        .filter((r) => `${r.resolvedSource.sourceType}::${r.resolvedSource.campaign ?? ""}` === `${row.sourceType}::${row.campaign ?? ""}`)
        .map((r) => r.attendeeEmail.toLowerCase()),
    );
    row.commission = round2(commissions.filter((c) => c.customerEmail && emails.has(c.customerEmail.toLowerCase())).reduce((s, c) => s + num(c.amount), 0));
    row.netRevenue = round2(row.totalRevenue - row.commission);

    const campaignSpend = promoExpenses
      .filter((e) => row.campaign && `${e.payeeName ?? ""} ${e.description ?? ""}`.toLowerCase().includes(row.campaign!.toLowerCase()))
      .reduce((s, e) => s + num(e.total), 0);

    if (campaignSpend > 0) {
      row.spend = round2(campaignSpend);
      row.spendKnown = true;
    } else if (["facebook", "instagram", "google", "email", "sms", "whatsapp"].includes(row.sourceType) && totalAdSpend > 0) {
      const paidRegs = [...map.values()].filter((s) => ["facebook", "instagram", "google", "email", "sms", "whatsapp"].includes(s.sourceType)).reduce((s, x) => s + x.registrations, 0);
      row.spend = paidRegs > 0 ? round2((totalAdSpend * row.registrations) / paidRegs) : null;
      row.spendKnown = true;
    }

    row.costPerRegistration = row.spend != null ? safeDivide(row.spend, row.registrations) : null;
    row.roi = row.spend != null && row.spend > 0 ? safeDivide(row.netRevenue - row.spend, row.spend) : null;
  }

  return [...map.values()].sort((a, b) => b.registrations - a.registrations);
}

function buildAffiliateRows(
  regs: EnrichedReg[],
  partners: Array<{ id: bigint; name: string; referralCode: string; commissionRate: Prisma.Decimal; totalClicks: number }>,
  links: Array<{ id: bigint; partnerId: bigint; slug: string; clickCount: number; trackingUrl: string; destinationUrl: string | null; program: { commissionType: string; commissionValue: Prisma.Decimal } }>,
  commissions: Array<{ partnerId: bigint; amount: Prisma.Decimal; status: string; eventId: bigint | null; customerEmail: string | null }>,
  eventSlug: string,
): EventMarketingAffiliateRow[] {
  const partnerMap = new Map(partners.map((p) => [p.id.toString(), p]));
  const byPartner = new Map<string, EnrichedReg[]>();
  for (const r of regs) {
    const pid = r.affiliatePartnerId?.toString();
    if (!pid) continue;
    const list = byPartner.get(pid) ?? [];
    list.push(r);
    byPartner.set(pid, list);
  }

  const rows: EventMarketingAffiliateRow[] = [];
  for (const [partnerId, partnerRegs] of byPartner) {
    const partner = partnerMap.get(partnerId);
    if (!partner) continue;
    const link = links.find((l) => l.partnerId.toString() === partnerId && (l.destinationUrl?.includes(eventSlug) || l.trackingUrl.includes(eventSlug))) ?? links.find((l) => l.partnerId.toString() === partnerId);
    const eventCommissions = commissions.filter((c) => c.partnerId.toString() === partnerId);
    rows.push({
      partnerId,
      affiliateName: partner.name,
      trackingCode: partner.referralCode,
      linkId: link?.id.toString() ?? null,
      clicks: link?.clickCount ?? partner.totalClicks,
      registrations: partnerRegs.length,
      checkedIn: partnerRegs.filter((r) => r.checkedInAt).length,
      ticketRevenue: round2(partnerRegs.reduce((s, r) => s + r.ticketRevenue, 0)),
      bonusCardRevenue: round2(partnerRegs.reduce((s, r) => s + r.bonusRevenue, 0)),
      commissionType: link?.program.commissionType ?? "percentage",
      commissionRate: link ? num(link.program.commissionValue) : num(partner.commissionRate),
      commissionAmount: round2(eventCommissions.reduce((s, c) => s + num(c.amount), 0)),
      payoutStatus: eventCommissions[0]?.status ?? null,
      trackingUrl: link ? buildAffiliateRedirectUrl(link.id.toString()) : null,
    });
  }
  return rows.sort((a, b) => b.registrations - a.registrations);
}

function buildPromotionRows(regs: EnrichedReg[], coupons: Array<{ id: bigint; code: string; type: string; discount: Prisma.Decimal; expiryDate: Date | null; status: boolean }>): EventMarketingPromotionRow[] {
  const couponByCode = new Map(coupons.map((c) => [c.code.toLowerCase(), c]));
  const byCode = new Map<string, EnrichedReg[]>();
  for (const r of regs) {
    const code = r.couponCode?.trim() || r.resolvedSource.promotionCode;
    if (!code) continue;
    const list = byCode.get(code.toLowerCase()) ?? [];
    list.push(r);
    byCode.set(code.toLowerCase(), list);
  }
  return [...byCode.entries()].map(([codeKey, codeRegs]) => {
    const coupon = couponByCode.get(codeKey);
    return {
      promotionId: coupon?.id.toString() ?? null,
      promotionName: coupon?.code ?? codeRegs[0]!.couponCode ?? codeKey,
      code: coupon?.code ?? codeRegs[0]!.couponCode ?? codeKey,
      discountType: coupon?.type ?? null,
      discountValue: coupon ? num(coupon.discount) : null,
      usageCount: codeRegs.length,
      totalDiscount: null,
      revenueGenerated: round2(codeRegs.reduce((s, r) => s + r.totalRevenue, 0)),
      startDate: null,
      endDate: coupon?.expiryDate?.toISOString() ?? null,
      status: coupon?.status ? "active" : "inactive",
    };
  });
}

function buildSponsorPanel(
  sponsor: LmsEventDetailSponsor | undefined,
  catalog: Array<{ id: bigint; name: string; phone: string | null; company: string | null }>,
  revenueEntries: Array<{ amount: Prisma.Decimal; paymentStatus: string }>,
): EventMarketingOverview["sponsor"] {
  if (!sponsor?.name?.trim()) return null;
  const matched = catalog.find((s) => s.name.toLowerCase() === sponsor.name.trim().toLowerCase());
  const contribution = revenueEntries.reduce((s, r) => s + num(r.amount), 0);
  const ext = sponsor as LmsEventDetailSponsor & { package?: string; paymentStatus?: string; deliverables?: string[]; completedDeliverables?: string[]; notes?: string; agreementUrl?: string; catalogSponsorId?: string };
  return {
    sponsorId: matched?.id.toString() ?? ext.catalogSponsorId ?? null,
    sponsorName: sponsor.name,
    package: ext.package ?? sponsor.perk ?? null,
    contribution: contribution > 0 ? contribution : null,
    paymentStatus: ext.paymentStatus ?? revenueEntries[0]?.paymentStatus ?? null,
    deliverables: ext.deliverables ?? (sponsor.perk ? [sponsor.perk] : []),
    completedDeliverables: ext.completedDeliverables ?? [],
    contact: [sponsor.phone, matched?.phone, matched?.company].filter(Boolean).join(" · ") || null,
    notes: ext.notes ?? null,
    agreementUrl: ext.agreementUrl ?? null,
    profileUrl: matched ? `${EVENT_PLATFORM_PATHS.sponsors}?q=${encodeURIComponent(matched.name)}` : EVENT_PLATFORM_PATHS.sponsors,
  };
}

function buildCharts(regs: EnrichedReg[], sources: EventMarketingSourceRow[], affiliates: EventMarketingAffiliateRow[], totalAdSpend: number): EventMarketingOverview["charts"] {
  const registrationsBySource: EventMarketingChartPoint[] = sources.map((s) => ({
    key: s.sourceType,
    label: s.sourceLabel,
    registrations: s.registrations,
    revenue: s.totalRevenue,
    spend: s.spend,
    conversionRate: s.checkInRate,
  }));
  const campaignMap = new Map<string, { registrations: number; revenue: number }>();
  for (const r of regs) {
    const camp = r.resolvedSource.campaign ?? "No campaign";
    const cur = campaignMap.get(camp) ?? { registrations: 0, revenue: 0 };
    cur.registrations += 1;
    cur.revenue += r.totalRevenue;
    campaignMap.set(camp, cur);
  }
  return {
    registrationsBySource,
    revenueBySource: [...registrationsBySource].sort((a, b) => b.revenue - a.revenue),
    registrationTrendByCampaign: [...campaignMap.entries()].map(([label, v]) => ({ key: label, label, registrations: v.registrations, revenue: round2(v.revenue), spend: null, conversionRate: null })),
    adSpendVsRevenue: [
      { key: "spend", label: "Ad spend", registrations: 0, revenue: 0, spend: totalAdSpend > 0 ? totalAdSpend : null, conversionRate: null },
      { key: "revenue", label: "Total revenue", registrations: regs.length, revenue: round2(regs.reduce((s, r) => s + r.totalRevenue, 0)), spend: null, conversionRate: null },
    ],
    affiliateConversion: affiliates.map((a) => ({
      key: a.partnerId,
      label: a.affiliateName,
      registrations: a.registrations,
      revenue: round2(a.ticketRevenue + a.bonusCardRevenue),
      spend: null,
      conversionRate: a.clicks > 0 ? round2((a.registrations / a.clicks) * 100) : null,
    })),
  };
}

export function marketingExportCsv(overview: EventMarketingOverview, section: "sources" | "affiliates" | "promotions" | "sponsor"): string {
  if (section === "sources") {
    const headers = ["Source", "Campaign", "Registrations", "Checked In", "Revenue", "Spend", "ROI"];
    const rows = overview.sources.map((r) => [r.sourceLabel, r.campaign ?? "", r.registrations, r.checkedIn, r.totalRevenue, r.spend ?? "", r.roi ?? ""].join(","));
    return [headers.join(","), ...rows].join("\n");
  }
  if (section === "affiliates") {
    const headers = ["Affiliate", "Code", "Clicks", "Registrations", "Commission", "Payout Status"];
    const rows = overview.affiliates.map((r) => [r.affiliateName, r.trackingCode, r.clicks, r.registrations, r.commissionAmount, r.payoutStatus ?? ""].join(","));
    return [headers.join(","), ...rows].join("\n");
  }
  if (section === "promotions") {
    const headers = ["Code", "Usage", "Revenue"];
    const rows = overview.promotions.map((r) => [r.code, r.usageCount, r.revenueGenerated].join(","));
    return [headers.join(","), ...rows].join("\n");
  }
  const s = overview.sponsor;
  if (!s) return "No sponsor";
  return ["Sponsor,Contribution,Payment Status", [s.sponsorName ?? "", s.contribution ?? "", s.paymentStatus ?? ""].join(",")].join("\n");
}

export async function runEventMarketingAction(params: {
  organizationId: bigint;
  eventId: bigint;
  actorUserId: bigint;
  action: string;
  body: Record<string, unknown>;
}): Promise<{ ok: boolean; message?: string }> {
  if (params.action === "approve_commission" && params.body.commissionId) {
    const row = await prisma.affiliateCommission.findFirst({
      where: { id: BigInt(String(params.body.commissionId)), organizationId: params.organizationId },
    });
    if (!row) return { ok: false, message: "Commission not found." };
    await prisma.affiliateCommission.update({ where: { id: row.id }, data: { status: "approved", updatedAt: new Date() } });
    await writeEventAuditLog({ organizationId: params.organizationId, actorUserId: params.actorUserId, action: "marketing.commission_approved", entityType: "affiliate_commission", entityId: row.id.toString() });
    return { ok: true };
  }
  if (params.action === "mark_commission_paid" && params.body.commissionId) {
    const row = await prisma.affiliateCommission.findFirst({
      where: { id: BigInt(String(params.body.commissionId)), organizationId: params.organizationId },
    });
    if (!row) return { ok: false, message: "Commission not found." };
    await prisma.affiliateCommission.update({ where: { id: row.id }, data: { status: "paid", updatedAt: new Date() } });
    return { ok: true };
  }
  return { ok: false, message: "Unknown action." };
}
