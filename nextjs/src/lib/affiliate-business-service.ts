import "server-only";

import { Prisma } from "@prisma/client";

import { decimalToNumber } from "@/lib/affiliate-access";
import {
  buildAffiliateTrackingUrl,
  DEFAULT_AFFILIATE_LANDING_URL,
  slugifyAffiliateLink,
} from "@/lib/affiliate-link-utils";
import { prisma } from "@/lib/prisma";

let schemaEnsured = false;

/** Prisma client must be regenerated after schema changes (`npx prisma generate`). */
export function isAffiliatePrismaReady(): boolean {
  const p = prisma as unknown as {
    affiliatePartner?: { count: unknown };
    affiliateLink?: { count: unknown };
  };
  return typeof p.affiliatePartner?.count === "function" && typeof p.affiliateLink?.count === "function";
}

export async function ensureAffiliateBusinessTables(): Promise<void> {
  if (schemaEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS affiliate_partners (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NULL,
        referral_code VARCHAR(64) NOT NULL,
        tier VARCHAR(32) NOT NULL DEFAULT 'standard',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
        total_clicks INT NOT NULL DEFAULT 0,
        total_conversions INT NOT NULL DEFAULT 0,
        lifetime_earnings DECIMAL(14,2) NOT NULL DEFAULT 0,
        joined_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS affiliate_partners_org_code_unique
      ON affiliate_partners(organization_id, referral_code);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS affiliate_programs (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        commission_type VARCHAR(32) NOT NULL DEFAULT 'percentage',
        commission_value DECIMAL(10,2) NOT NULL,
        cookie_days INT NOT NULL DEFAULT 30,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS affiliate_commissions (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        partner_id BIGINT NOT NULL,
        program_id BIGINT NOT NULL,
        order_ref VARCHAR(128) NOT NULL,
        customer_email VARCHAR(255) NULL,
        amount DECIMAL(14,2) NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'USD',
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        earned_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS affiliate_payouts (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        partner_id BIGINT NOT NULL,
        amount DECIMAL(14,2) NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'USD',
        status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
        method VARCHAR(64) NOT NULL DEFAULT 'bank_transfer',
        scheduled_at TIMESTAMP(3) NOT NULL,
        paid_at TIMESTAMP(3) NULL,
        reference VARCHAR(128) NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS affiliate_links (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL,
        partner_id BIGINT NOT NULL,
        program_id BIGINT NOT NULL,
        label VARCHAR(255) NULL,
        destination_url VARCHAR(2048) NULL,
        slug VARCHAR(64) NOT NULL,
        tracking_url VARCHAR(2048) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        click_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS affiliate_links_org_slug_unique
      ON affiliate_links(organization_id, slug);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS affiliate_links_org_status_idx
      ON affiliate_links(organization_id, status);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS affiliate_settings (
        id BIGSERIAL PRIMARY KEY,
        organization_id BIGINT NOT NULL UNIQUE,
        default_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
        cookie_window_days INT NOT NULL DEFAULT 30,
        minimum_payout DECIMAL(14,2) NOT NULL DEFAULT 50,
        auto_approve_commissions BOOLEAN NOT NULL DEFAULT false,
        notification_email VARCHAR(255) NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'USD',
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NULL
      );
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE affiliate_settings
      ADD COLUMN IF NOT EXISTS default_landing_url VARCHAR(2048) NULL;
    `);
    schemaEnsured = true;
  } catch (e) {
    console.error("[affiliate] ensureAffiliateBusinessTables failed:", e);
    throw e;
  }
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Idempotent demo seed for a company organization. */
export async function seedAffiliateBusinessDemoData(organizationId: bigint): Promise<{ seeded: boolean }> {
  if (!isAffiliatePrismaReady()) {
    console.error(
      "[affiliate] Prisma client missing AffiliateBusiness models. Run: npx prisma generate — then restart the dev server.",
    );
    return { seeded: false };
  }

  await ensureAffiliateBusinessTables();

  const existing = await prisma.affiliatePartner.count({ where: { organizationId } });
  if (existing > 0) return { seeded: false };

  const partners = await Promise.all(
    [
      {
        name: "Alex Rivera",
        email: "alex.rivera@affiliate-demo.com",
        referralCode: "ALEX10",
        tier: "gold",
        status: "active",
        commissionRate: 15,
        totalClicks: 1240,
        totalConversions: 86,
        lifetimeEarnings: 4280.5,
        joinedAt: daysAgo(120),
      },
      {
        name: "Jordan Kim",
        email: "jordan.kim@affiliate-demo.com",
        referralCode: "JKIM20",
        tier: "platinum",
        status: "active",
        commissionRate: 20,
        totalClicks: 2105,
        totalConversions: 142,
        lifetimeEarnings: 9120.75,
        joinedAt: daysAgo(200),
      },
      {
        name: "Sam Patel",
        email: "sam.patel@affiliate-demo.com",
        referralCode: "SAM15",
        tier: "silver",
        status: "active",
        commissionRate: 12,
        totalClicks: 890,
        totalConversions: 54,
        lifetimeEarnings: 2650,
        joinedAt: daysAgo(90),
      },
      {
        name: "Taylor Brooks",
        email: "taylor.b@affiliate-demo.com",
        referralCode: "TBROOKS",
        tier: "standard",
        status: "pending",
        commissionRate: 10,
        totalClicks: 45,
        totalConversions: 2,
        lifetimeEarnings: 120,
        joinedAt: daysAgo(14),
      },
      {
        name: "Morgan Lee",
        email: "morgan.lee@affiliate-demo.com",
        referralCode: "MLEE25",
        tier: "gold",
        status: "active",
        commissionRate: 15,
        totalClicks: 1560,
        totalConversions: 98,
        lifetimeEarnings: 5890.25,
        joinedAt: daysAgo(160),
      },
      {
        name: "Casey Nguyen",
        email: "casey.n@affiliate-demo.com",
        referralCode: "CASEY5",
        tier: "standard",
        status: "suspended",
        commissionRate: 8,
        totalClicks: 320,
        totalConversions: 12,
        lifetimeEarnings: 480,
        joinedAt: daysAgo(300),
      },
    ].map((p) =>
      prisma.affiliatePartner.create({
        data: {
          organizationId,
          name: p.name,
          email: p.email,
          referralCode: p.referralCode,
          tier: p.tier,
          status: p.status,
          commissionRate: new Prisma.Decimal(p.commissionRate),
          totalClicks: p.totalClicks,
          totalConversions: p.totalConversions,
          lifetimeEarnings: new Prisma.Decimal(p.lifetimeEarnings),
          joinedAt: p.joinedAt,
        },
      }),
    ),
  );

  const programs = await Promise.all(
    [
      {
        name: "SaaS Annual Plans",
        description: "20% commission on first-year annual subscriptions referred through your link.",
        commissionType: "percentage",
        commissionValue: 20,
        cookieDays: 45,
        status: "active",
      },
      {
        name: "Starter Bundle",
        description: "Flat $25 per qualified signup on the Starter plan.",
        commissionType: "flat",
        commissionValue: 25,
        cookieDays: 30,
        status: "active",
      },
      {
        name: "LMS Course Sales",
        description: "15% on all course purchases attributed to your referral code.",
        commissionType: "percentage",
        commissionValue: 15,
        cookieDays: 60,
        status: "active",
      },
      {
        name: "Holiday Promo 2026",
        description: "Limited-time boosted commissions for Q2 campaigns.",
        commissionType: "percentage",
        commissionValue: 30,
        cookieDays: 14,
        status: "paused",
      },
    ].map((p) =>
      prisma.affiliateProgram.create({
        data: {
          organizationId,
          name: p.name,
          description: p.description,
          commissionType: p.commissionType,
          commissionValue: new Prisma.Decimal(p.commissionValue),
          cookieDays: p.cookieDays,
          status: p.status,
        },
      }),
    ),
  );

  const commissionRows = [
    { partner: 0, program: 0, orderRef: "ORD-10041", email: "buyer1@example.com", amount: 149.5, status: "approved", days: 2 },
    { partner: 0, program: 2, orderRef: "ORD-10038", email: "learner@example.com", amount: 22.35, status: "pending", days: 5 },
    { partner: 1, program: 0, orderRef: "ORD-10035", email: "corp@acme.io", amount: 890, status: "approved", days: 8 },
    { partner: 1, program: 1, orderRef: "ORD-10030", email: "trial@startup.co", amount: 25, status: "paid", days: 12 },
    { partner: 2, program: 2, orderRef: "ORD-10028", email: "student@school.edu", amount: 44.85, status: "approved", days: 15 },
    { partner: 4, program: 0, orderRef: "ORD-10022", email: "ops@bigco.com", amount: 1200, status: "approved", days: 20 },
    { partner: 4, program: 2, orderRef: "ORD-10019", email: "dev@code.test", amount: 67.5, status: "pending", days: 22 },
    { partner: 1, program: 2, orderRef: "ORD-10015", email: "pm@product.io", amount: 89.1, status: "rejected", days: 25 },
    { partner: 2, program: 1, orderRef: "ORD-10012", email: "founder@saas.dev", amount: 25, status: "paid", days: 30 },
    { partner: 0, program: 1, orderRef: "ORD-10008", email: "hello@mail.com", amount: 25, status: "paid", days: 35 },
    { partner: 4, program: 1, orderRef: "ORD-10005", email: "team@agency.net", amount: 25, status: "approved", days: 40 },
    { partner: 5, program: 2, orderRef: "ORD-10002", email: "old@client.com", amount: 18, status: "rejected", days: 60 },
  ];

  for (const c of commissionRows) {
    await prisma.affiliateCommission.create({
      data: {
        organizationId,
        partnerId: partners[c.partner]!.id,
        programId: programs[c.program]!.id,
        orderRef: c.orderRef,
        customerEmail: c.email,
        amount: new Prisma.Decimal(c.amount),
        currency: "USD",
        status: c.status,
        earnedAt: daysAgo(c.days),
      },
    });
  }

  const payoutRows = [
    { partner: 1, amount: 2500, status: "paid", method: "bank_transfer", days: 3, ref: "PAY-2026-0412" },
    { partner: 0, amount: 890.5, status: "processing", method: "paypal", days: 0, ref: "PAY-2026-0418" },
    { partner: 4, amount: 1200, status: "scheduled", method: "bank_transfer", days: -7, ref: null },
    { partner: 2, amount: 450, status: "paid", method: "bank_transfer", days: 10, ref: "PAY-2026-0401" },
    { partner: 0, amount: 320, status: "failed", method: "paypal", days: 5, ref: "PAY-2026-0398" },
  ];

  for (const p of payoutRows) {
    const scheduledAt = daysAgo(Math.max(0, p.days));
    await prisma.affiliatePayout.create({
      data: {
        organizationId,
        partnerId: partners[p.partner]!.id,
        amount: new Prisma.Decimal(p.amount),
        currency: "USD",
        status: p.status,
        method: p.method,
        scheduledAt,
        paidAt: p.status === "paid" ? scheduledAt : null,
        reference: p.ref,
      },
    });
  }

  await prisma.affiliateSettings.create({
    data: {
      organizationId,
      defaultCommissionRate: new Prisma.Decimal(10),
      cookieWindowDays: 30,
      minimumPayout: new Prisma.Decimal(50),
      autoApproveCommissions: false,
      notificationEmail: "affiliates@paperflight.demo",
      defaultLandingUrl: DEFAULT_AFFILIATE_LANDING_URL,
      currency: "USD",
    },
  });

  await seedAffiliateLinksForOrg(organizationId, partners, programs);

  return { seeded: true };
}

export async function getAffiliateDefaultLandingUrl(organizationId: bigint): Promise<string> {
  const settings = await prisma.affiliateSettings.findUnique({
    where: { organizationId },
    select: { defaultLandingUrl: true },
  });
  return settings?.defaultLandingUrl?.trim() || DEFAULT_AFFILIATE_LANDING_URL;
}

/** Create links for active partner × program pairs that do not already have a link. */
export async function seedAffiliateLinksForOrg(
  organizationId: bigint,
  partners?: Array<{ id: bigint; name: string; referralCode: string; status: string }>,
  programs?: Array<{ id: bigint; name: string; status: string }>,
  opts?: { onlyIfEmpty?: boolean },
): Promise<{ created: number }> {
  if (!isAffiliatePrismaReady()) return { created: 0 };

  if (opts?.onlyIfEmpty !== false) {
    const existing = await prisma.affiliateLink.count({ where: { organizationId } });
    if (existing > 0) return { created: 0 };
  }

  const partnerRows =
    partners ??
    (await prisma.affiliatePartner.findMany({
      where: { organizationId, status: "active" },
      select: { id: true, name: true, referralCode: true, status: true },
    }));
  const programRows =
    programs ??
    (await prisma.affiliateProgram.findMany({
      where: { organizationId },
      select: { id: true, name: true, status: true },
    }));

  const baseUrl = await getAffiliateDefaultLandingUrl(organizationId);
  let created = 0;

  for (const partner of partnerRows.filter((p) => p.status === "active")) {
    for (const program of programRows.filter((p) => p.status === "active")) {
      const pairExists = await prisma.affiliateLink.findFirst({
        where: { organizationId, partnerId: partner.id, programId: program.id },
        select: { id: true },
      });
      if (pairExists) continue;

      const programId = program.id.toString();
      let slug = slugifyAffiliateLink(partner.referralCode, program.name, programId);
      const taken = await prisma.affiliateLink.findFirst({
        where: { organizationId, slug },
        select: { id: true },
      });
      if (taken) slug = `${slug}-${partner.id.toString().slice(-3)}`.slice(0, 64);

      const trackingUrl = buildAffiliateTrackingUrl({
        baseUrl,
        referralCode: partner.referralCode,
        programId,
        slug,
      });
      if (!trackingUrl) continue;

      await prisma.affiliateLink.create({
        data: {
          organizationId,
          partnerId: partner.id,
          programId: program.id,
          label: `${partner.name} — ${program.name}`,
          slug,
          trackingUrl,
          status: "active",
          clickCount: Math.floor(Math.random() * 120) + 5,
        },
      });
      created += 1;
    }
  }

  return { created };
}

export async function ensureAffiliateDemoForOrg(organizationId: bigint): Promise<void> {
  await ensureAffiliateBusinessTables();
  if (!isAffiliatePrismaReady()) return;
  await seedAffiliateBusinessDemoData(organizationId);
  await seedAffiliateLinksForOrg(organizationId, undefined, undefined, { onlyIfEmpty: true });
}

export function serializePartner(row: {
  id: bigint;
  name: string;
  email: string | null;
  referralCode: string;
  tier: string;
  status: string;
  commissionRate: Prisma.Decimal;
  totalClicks: number;
  totalConversions: number;
  lifetimeEarnings: Prisma.Decimal;
  joinedAt: Date;
}) {
  return {
    id: row.id.toString(),
    name: row.name,
    email: row.email,
    referralCode: row.referralCode,
    tier: row.tier,
    status: row.status,
    commissionRate: decimalToNumber(row.commissionRate),
    totalClicks: row.totalClicks,
    totalConversions: row.totalConversions,
    lifetimeEarnings: decimalToNumber(row.lifetimeEarnings),
    joinedAt: row.joinedAt.toISOString(),
  };
}

export function serializeProgram(row: {
  id: bigint;
  name: string;
  description: string | null;
  commissionType: string;
  commissionValue: Prisma.Decimal;
  cookieDays: number;
  status: string;
  createdAt: Date;
  _count?: { commissions: number };
}) {
  return {
    id: row.id.toString(),
    name: row.name,
    description: row.description,
    commissionType: row.commissionType,
    commissionValue: decimalToNumber(row.commissionValue),
    cookieDays: row.cookieDays,
    status: row.status,
    commissionCount: row._count?.commissions ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeCommission(row: {
  id: bigint;
  orderRef: string;
  customerEmail: string | null;
  amount: Prisma.Decimal;
  currency: string;
  status: string;
  earnedAt: Date;
  partner: { id: bigint; name: string; referralCode: string };
  program: { id: bigint; name: string };
}) {
  return {
    id: row.id.toString(),
    orderRef: row.orderRef,
    customerEmail: row.customerEmail,
    amount: decimalToNumber(row.amount),
    currency: row.currency,
    status: row.status,
    earnedAt: row.earnedAt.toISOString(),
    partner: {
      id: row.partner.id.toString(),
      name: row.partner.name,
      referralCode: row.partner.referralCode,
    },
    program: { id: row.program.id.toString(), name: row.program.name },
  };
}

export function serializeLink(row: {
  id: bigint;
  label: string | null;
  destinationUrl: string | null;
  slug: string;
  trackingUrl: string;
  status: string;
  clickCount: number;
  createdAt: Date;
  partner: { id: bigint; name: string; referralCode: string };
  program: { id: bigint; name: string };
}) {
  return {
    id: row.id.toString(),
    label: row.label,
    destinationUrl: row.destinationUrl,
    slug: row.slug,
    trackingUrl: row.trackingUrl,
    status: row.status,
    clickCount: row.clickCount,
    createdAt: row.createdAt.toISOString(),
    partner: {
      id: row.partner.id.toString(),
      name: row.partner.name,
      referralCode: row.partner.referralCode,
    },
    program: { id: row.program.id.toString(), name: row.program.name },
  };
}

export function serializePayout(row: {
  id: bigint;
  amount: Prisma.Decimal;
  currency: string;
  status: string;
  method: string;
  scheduledAt: Date;
  paidAt: Date | null;
  reference: string | null;
  partner: { id: bigint; name: string };
}) {
  return {
    id: row.id.toString(),
    amount: decimalToNumber(row.amount),
    currency: row.currency,
    status: row.status,
    method: row.method,
    scheduledAt: row.scheduledAt.toISOString(),
    paidAt: row.paidAt?.toISOString() ?? null,
    reference: row.reference,
    partner: { id: row.partner.id.toString(), name: row.partner.name },
  };
}
