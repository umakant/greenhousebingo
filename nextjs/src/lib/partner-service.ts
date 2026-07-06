import "server-only";

import { prisma } from "@/lib/prisma";
import { getSuperadminId, upsertOwnerSettings, getSettingsForOwner } from "@/lib/settings-service";

export const PARTNER_DEFAULT_COMMISSION_RATE_KEY = "partner_default_commission_rate";
/** Platform default marketplace commission rule (separate from subscription commission). */
export const PARTNER_MARKETPLACE_COMMISSION_TYPE_KEY = "partner_marketplace_commission_type";
export const PARTNER_MARKETPLACE_COMMISSION_VALUE_KEY = "partner_marketplace_commission_value";

/** Marketplace commission rule: percentage of order total, a flat amount per order, or off. */
export type MarketplaceCommissionType = "percentage" | "flat" | "none";
export type MarketplaceCommissionRule = { type: MarketplaceCommissionType; value: number };

export function normalizeMarketplaceCommissionType(raw: unknown): MarketplaceCommissionType {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "percentage" || s === "percent" || s === "%") return "percentage";
  if (s === "flat" || s === "fixed") return "flat";
  return "none";
}

export async function nextPartnerId(): Promise<bigint> {
  const agg = await prisma.partner.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function nextPartnerReferralId(): Promise<bigint> {
  const agg = await prisma.partnerReferral.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function nextPartnerCommissionId(): Promise<bigint> {
  const agg = await prisma.partnerCommission.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function nextPartnerPayoutId(): Promise<bigint> {
  const agg = await prisma.partnerPayout.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function nextPartnerLandingPageId(): Promise<bigint> {
  const agg = await prisma.partnerLandingPage.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function ensureUniquePartnerSlug(base: string): Promise<string> {
  const root = slugify(base) || `partner-${Date.now().toString(36)}`;
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.partner.findFirst({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

export async function ensureUniqueReferralCode(seed?: string): Promise<string> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const base = (seed ? slugify(seed).replace(/-/g, "").toUpperCase().slice(0, 6) : "PF") || "PF";
    const candidate = `${base}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const existing = await prisma.partner.findFirst({
      where: { referralCode: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
}

/** Links an ownership brand holder to a referral Partner row (creates one when missing). */
export async function ensureReferralPartnerForOwnershipHolder(holderId: bigint) {
  const holder = await prisma.ownershipBrandHolder.findUnique({
    where: { id: holderId },
    include: { brand: { select: { name: true } } },
  });
  if (!holder) {
    throw new Error("Ownership partner not found.");
  }

  if (holder.partnerId) {
    const linked = await prisma.partner.findFirst({ where: { id: holder.partnerId } });
    if (linked) return linked;
  }

  const name = holder.name.trim();
  const slug = await ensureUniquePartnerSlug(name);
  let referralCode = holder.referralCode?.trim() || "";
  if (referralCode) {
    const taken = await prisma.partner.findFirst({ where: { referralCode }, select: { id: true } });
    if (taken) referralCode = "";
  }
  if (!referralCode) {
    referralCode = await ensureUniqueReferralCode(name);
  }

  const partner = await prisma.partner.create({
    data: {
      id: await nextPartnerId(),
      name,
      email: holder.email,
      phone: holder.phone,
      brandName: holder.brand.name,
      slug,
      referralCode,
      status: "active",
      payoutMethod: holder.payoutMethod,
      payoutEmail: holder.payoutEmail,
      notes: holder.notes,
      createdAt: new Date(),
    },
  });

  await prisma.ownershipBrandHolder.update({
    where: { id: holder.id },
    data: { partnerId: partner.id, referralCode: partner.referralCode },
  });

  return partner;
}

export async function resolveCompanyPartnerId(raw: string): Promise<bigint | null> {
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith("holder:")) {
    const holderIdRaw = value.slice("holder:".length);
    if (!/^\d+$/.test(holderIdRaw)) return null;
    const partner = await ensureReferralPartnerForOwnershipHolder(BigInt(holderIdRaw));
    return partner.id;
  }

  if (/^\d+$/.test(value)) return BigInt(value);
  return null;
}

export async function getDefaultCommissionRate(): Promise<number> {
  try {
    const ownerId = await getSuperadminId();
    const blob = await getSettingsForOwner(ownerId);
    const raw = (blob as Record<string, unknown>)[PARTNER_DEFAULT_COMMISSION_RATE_KEY];
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* fall through to env / default */
  }
  const envRate = Number(process.env.PARTNER_DEFAULT_COMMISSION_RATE);
  if (Number.isFinite(envRate) && envRate > 0) return envRate;
  return 10;
}

export async function setDefaultCommissionRate(rate: number): Promise<void> {
  const ownerId = await getSuperadminId();
  await upsertOwnerSettings(ownerId, [
    { key: PARTNER_DEFAULT_COMMISSION_RATE_KEY, value: String(rate), isPublic: false },
  ]);
}

/**
 * Platform default marketplace commission rule. Defaults to "none" (off) so marketplace
 * commission is opt-in and never interferes with subscription commissions.
 */
export async function getMarketplaceDefaultCommissionRule(): Promise<MarketplaceCommissionRule> {
  try {
    const ownerId = await getSuperadminId();
    const blob = (await getSettingsForOwner(ownerId)) as Record<string, unknown>;
    const type = normalizeMarketplaceCommissionType(blob[PARTNER_MARKETPLACE_COMMISSION_TYPE_KEY]);
    const value = Number(blob[PARTNER_MARKETPLACE_COMMISSION_VALUE_KEY]);
    return { type, value: Number.isFinite(value) && value > 0 ? value : 0 };
  } catch {
    return { type: "none", value: 0 };
  }
}

export async function setMarketplaceDefaultCommissionRule(rule: MarketplaceCommissionRule): Promise<void> {
  const ownerId = await getSuperadminId();
  await upsertOwnerSettings(ownerId, [
    { key: PARTNER_MARKETPLACE_COMMISSION_TYPE_KEY, value: rule.type, isPublic: false },
    { key: PARTNER_MARKETPLACE_COMMISSION_VALUE_KEY, value: String(rule.value), isPublic: false },
  ]);
}

/**
 * Resolve the effective marketplace commission rule for a partner: a per-partner rule
 * (if configured) overrides the platform default.
 */
export async function resolveMarketplaceCommissionRule(partner: {
  marketplaceCommissionType?: string | null;
  marketplaceCommissionValue?: unknown;
}): Promise<MarketplaceCommissionRule> {
  const type = normalizeMarketplaceCommissionType(partner.marketplaceCommissionType);
  if (type !== "none") {
    const value = Number(partner.marketplaceCommissionValue);
    return { type, value: Number.isFinite(value) && value > 0 ? value : 0 };
  }
  // No per-partner override → fall back to platform default.
  return getMarketplaceDefaultCommissionRule();
}

export type PartnerStats = {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  paidCompanies: number;
  cancelledCompanies: number;
  commissionEarned: number;
  commissionPending: number;
  commissionApproved: number;
  commissionPaid: number;
  /** Marketplace analytics (separate from subscription commission totals above). */
  marketplaceRevenue: number;
  marketplaceOrders: number;
  marketplaceCompanies: number;
  marketplaceCommissionEarned: number;
  marketplaceCommissionPending: number;
  marketplaceCommissionPaid: number;
};

/** Order statuses that count as paid marketplace revenue. */
const MARKETPLACE_PAID_ORDER_WHERE = {
  OR: [{ paymentStatus: "paid" }, { orderStatus: { in: ["paid", "scheduled"] } }],
};

/** Aggregate referral + commission stats for a single partner (subscription + marketplace). */
export async function computePartnerStats(partnerId: bigint): Promise<PartnerStats> {
  const [referrals, commissions, companies, mpCommissions] = await Promise.all([
    prisma.partnerReferral.findMany({
      where: { partnerId },
      select: { referralStatus: true },
    }),
    // Subscription commissions only — keep marketplace out of the legacy totals.
    prisma.partnerCommission.findMany({
      where: { partnerId, sourceType: { not: "marketplace" } },
      select: { status: true, commissionAmount: true },
    }),
    prisma.user.findMany({
      where: { partnerId, type: { in: ["company", "company_admin"] } },
      select: { id: true, activePlan: true, isActive: true },
    }),
    prisma.partnerCommission.findMany({
      where: { partnerId, sourceType: "marketplace" },
      select: { status: true, commissionAmount: true },
    }),
  ]);

  const refStatus = (s: string) => referrals.filter((r) => r.referralStatus === s).length;

  let commissionEarned = 0;
  let commissionPending = 0;
  let commissionApproved = 0;
  let commissionPaid = 0;
  for (const c of commissions) {
    const amt = Number(c.commissionAmount);
    commissionEarned += amt;
    if (c.status === "pending") commissionPending += amt;
    else if (c.status === "approved") commissionApproved += amt;
    else if (c.status === "paid") commissionPaid += amt;
  }

  let marketplaceCommissionEarned = 0;
  let marketplaceCommissionPending = 0;
  let marketplaceCommissionPaid = 0;
  for (const c of mpCommissions) {
    const amt = Number(c.commissionAmount);
    marketplaceCommissionEarned += amt;
    if (c.status === "paid") marketplaceCommissionPaid += amt;
    else marketplaceCommissionPending += amt;
  }

  // Marketplace revenue from this partner's referred companies (paid orders only).
  const companyIds = companies.map((c) => c.id);
  let marketplaceRevenue = 0;
  let marketplaceOrders = 0;
  let marketplaceCompanies = 0;
  if (companyIds.length > 0) {
    const orders = await prisma.marketplaceOrder.findMany({
      where: { buyerOrganizationId: { in: companyIds }, ...MARKETPLACE_PAID_ORDER_WHERE },
      select: { buyerOrganizationId: true, total: true, totalAmount: true },
    });
    const buyers = new Set<string>();
    for (const o of orders) {
      marketplaceRevenue += o.totalAmount == null ? Number(o.total) : Number(o.totalAmount);
      buyers.add(o.buyerOrganizationId.toString());
    }
    marketplaceOrders = orders.length;
    marketplaceCompanies = buyers.size;
  }

  return {
    totalCompanies: companies.length,
    activeCompanies: companies.filter((c) => c.isActive !== false).length,
    trialCompanies: refStatus("trial"),
    paidCompanies: companies.filter((c) => c.activePlan != null).length,
    cancelledCompanies: refStatus("cancelled"),
    commissionEarned,
    commissionPending,
    commissionApproved,
    commissionPaid,
    marketplaceRevenue: Math.round(marketplaceRevenue * 100) / 100,
    marketplaceOrders,
    marketplaceCompanies,
    marketplaceCommissionEarned: Math.round(marketplaceCommissionEarned * 100) / 100,
    marketplaceCommissionPending: Math.round(marketplaceCommissionPending * 100) / 100,
    marketplaceCommissionPaid: Math.round(marketplaceCommissionPaid * 100) / 100,
  };
}

/** Resolve a partner for referral attribution by slug and/or referral code. Only active partners attribute. */
export async function resolvePartnerForAttribution(opts: {
  slug?: string | null;
  referralCode?: string | null;
}): Promise<{ id: bigint; slug: string; referralCode: string } | null> {
  const slug = (opts.slug ?? "").trim();
  const code = (opts.referralCode ?? "").trim();
  if (!slug && !code) return null;

  const or: Array<Record<string, unknown>> = [];
  if (slug) or.push({ slug });
  if (code) or.push({ referralCode: code });

  const partner = await prisma.partner.findFirst({
    where: { OR: or, status: { in: ["active", "pending"] } },
    select: { id: true, slug: true, referralCode: true, status: true },
    orderBy: { status: "asc" },
  });
  if (!partner) return null;
  // Only active partners earn attribution; pending partners do not attribute referrals.
  if (partner.status !== "active") return null;
  return { id: partner.id, slug: partner.slug, referralCode: partner.referralCode };
}

/** Attribute a newly created company to a partner and record the referral (best-effort, never throws). */
export async function attributeCompanyToPartner(opts: {
  companyUserId: bigint;
  slug?: string | null;
  referralCode?: string | null;
  sourceUrl?: string | null;
}): Promise<void> {
  try {
    const partner = await resolvePartnerForAttribution({ slug: opts.slug, referralCode: opts.referralCode });
    if (!partner) return;

    await prisma.user.update({
      where: { id: opts.companyUserId },
      data: {
        partnerId: partner.id,
        referralSource: opts.slug ? `slug:${opts.slug}` : opts.referralCode ? `code:${opts.referralCode}` : "referral",
        referredAt: new Date(),
      },
    });

    const existing = await prisma.partnerReferral.findFirst({
      where: { partnerId: partner.id, companyId: opts.companyUserId },
      select: { id: true },
    });
    if (!existing) {
      await prisma.partnerReferral.create({
        data: {
          id: await nextPartnerReferralId(),
          partnerId: partner.id,
          companyId: opts.companyUserId,
          referralCode: partner.referralCode,
          partnerSlug: partner.slug,
          sourceUrl: opts.sourceUrl ?? null,
          signupDate: new Date(),
          referralStatus: "pending",
          createdAt: new Date(),
        },
      });
    }
  } catch (err) {
    console.warn("[partner] attribution skipped:", (err as Error)?.message ?? err);
  }
}

export function serializePartner(p: {
  id: bigint;
  userId: bigint | null;
  name: string;
  email: string | null;
  phone: string | null;
  brandName: string | null;
  slug: string;
  referralCode: string;
  commissionRate: unknown;
  marketplaceCommissionType?: string | null;
  marketplaceCommissionValue?: unknown;
  status: string;
  payoutMethod: string | null;
  payoutEmail: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}) {
  return {
    id: p.id.toString(),
    userId: p.userId ? p.userId.toString() : null,
    name: p.name,
    email: p.email,
    phone: p.phone,
    brandName: p.brandName,
    slug: p.slug,
    referralCode: p.referralCode,
    commissionRate: p.commissionRate != null ? Number(p.commissionRate) : null,
    marketplaceCommissionType: normalizeMarketplaceCommissionType(p.marketplaceCommissionType),
    marketplaceCommissionValue:
      p.marketplaceCommissionValue != null ? Number(p.marketplaceCommissionValue) : null,
    status: p.status,
    payoutMethod: p.payoutMethod,
    payoutEmail: p.payoutEmail,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
  };
}
