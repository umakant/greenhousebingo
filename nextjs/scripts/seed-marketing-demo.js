/* eslint-disable no-console */
/**
 * Seed realistic Marketing / attribution demo data for a single event so the
 * Command Center → Marketing tab is fully populated: registrations spread across
 * every attribution bucket (affiliate, promotion code, customer referral, venue,
 * paid UTM campaigns, organic/direct), matching transactions for revenue,
 * affiliate partners + program + links + commissions, coupons, and promotions
 * ad-spend expenses (drives ROAS / cost-per-registration).
 *
 * Every seeded registration carries at least one attribution field, so the tab
 * reports "All registrations have attribution metadata on file."
 *
 * Prereq: node ./scripts/ensure-event-platform-schema.js && npx prisma generate
 * Usage:  node ./scripts/seed-marketing-demo.js                 (defaults to event id 10)
 *         node ./scripts/seed-marketing-demo.js --event-id=10
 *         node ./scripts/seed-marketing-demo.js --slug=<event-slug>
 */

const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

const DEMO_TAG = "[mkt-demo]";
const DEMO_DOMAIN = "marketing-demo.test";
const USER_ID_BASE = 991000n;
const ORDER_REF_PREFIX = "MKT-DEMO-";
const DEFAULT_EVENT_ID = 10n;

const BONUS_CARD_TICKET_DESCRIPTION = "Additional bingo card for the same event";
const EXTRA_BINGO_CARD_TICKET_NAME = "Extra bingo card";
const DEFAULT_BONUS_CARD_NAME = "Bonus card";

function isBonusTicket(t) {
  if (!t) return false;
  return (
    t.description === BONUS_CARD_TICKET_DESCRIPTION ||
    t.name === EXTRA_BINGO_CARD_TICKET_NAME ||
    t.name === DEFAULT_BONUS_CARD_NAME
  );
}

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

function daysAgo(n, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function pick(arr, i) {
  return arr[i % arr.length];
}

const FIRST_NAMES = [
  "Ava", "Liam", "Olivia", "Noah", "Emma", "Ethan", "Sophia", "Mason", "Isabella", "Lucas",
  "Mia", "Logan", "Amelia", "Jackson", "Harper", "Aiden", "Evelyn", "Elijah", "Abigail", "James",
  "Ella", "Benjamin", "Scarlett", "Sebastian", "Grace", "Henry", "Chloe", "Owen", "Lily", "Jack",
  "Zoe", "Wyatt", "Nora", "Leo", "Hazel", "Julian", "Aurora", "Levi", "Riley", "Isaac",
  "Layla", "Gabriel", "Aria", "Anthony", "Ellie", "Dylan", "Stella", "Nathan", "Natalie", "Caleb",
];
const LAST_NAMES = [
  "Anderson", "Brooks", "Carter", "Diaz", "Evans", "Foster", "Garcia", "Hughes", "Ingram", "Jensen",
  "Kelly", "Lopez", "Morgan", "Nguyen", "Ortiz", "Patel", "Quinn", "Reyes", "Sullivan", "Torres",
  "Underwood", "Vega", "Wallace", "Young", "Bennett", "Coleman", "Dawson", "Ellis", "Fisher", "Grant",
];

// Affiliate partners (created fresh for the demo). Referral codes here must NOT
// collide with the customer-referral codes below, so they resolve as "affiliate".
const AFFILIATES = [
  { key: "gtc", name: "Green Thumb Collective", referralCode: "GTC2026", commissionRate: 12 },
  { key: "urban", name: "Urban Jungle Co.", referralCode: "URBANJ", commissionRate: 15 },
  { key: "ppc", name: "Plant Parents Club", referralCode: "PPCLUB", commissionRate: 10 },
];

const COUPONS = [
  { code: "SUMMER15", name: "Summer 15% off", type: "percentage", discount: 15 },
  { code: "PLANTLOVE", name: "Plant Love $5 off", type: "fixed", discount: 5 },
  { code: "BINGO20", name: "Bingo Night 20% off", type: "percentage", discount: 20 },
];

/**
 * Registration bucket plan. Each entry produces `count` registrations with the
 * attribution fields defined by `build(i)`. `attributed` is informational only.
 */
const PLAN = [
  { bucket: "affiliate", count: 48, campaign: "greenhouse-partners" },
  { bucket: "promotion_code", count: 34, campaign: "summer-promo" },
  { bucket: "customer_referral", count: 30, campaign: null },
  { bucket: "venue_website", count: 16, campaign: null },
  { bucket: "venue_qr", count: 12, campaign: null },
  { bucket: "facebook", count: 18, campaign: "sidelake-launch" },
  { bucket: "instagram", count: 12, campaign: "sidelake-launch" },
  { bucket: "google", count: 16, campaign: "plant-bingo-summer" },
  { bucket: "email", count: 14, campaign: "july-blast" },
  { bucket: "organic", count: 20, campaign: null },
  { bucket: "direct", count: 18, campaign: null },
];

// Promotions ad spend (drives ad spend / ROAS / cost-per-registration).
const PROMO_EXPENSES = [
  { payeeName: "Meta Ads", description: "Facebook & Instagram promotion", total: 260.0 },
  { payeeName: "Google Ads", description: "Search campaign plant-bingo-summer", total: 180.0 },
  { payeeName: "Mailchimp", description: "Email campaign july-blast", total: 60.0 },
  { payeeName: "SMS Gateway", description: "Reminder texts", total: 30.0 },
];

async function resolveEvent() {
  const idArg = readArg("--event-id");
  const slugArg = readArg("--slug");
  if (idArg) return prisma.lmsTrainingEvent.findFirst({ where: { id: BigInt(idArg) } });
  if (slugArg) return prisma.lmsTrainingEvent.findFirst({ where: { slug: slugArg } });
  return prisma.lmsTrainingEvent.findFirst({ where: { id: DEFAULT_EVENT_ID } });
}

async function cleanup(orgId, eventId) {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
    select: { id: true },
  });
  const demoUserIds = demoUsers.map((u) => u.id);
  if (demoUserIds.length) {
    // Registrations cascade to transactions.
    await prisma.lmsEventRegistration.deleteMany({
      where: { eventId, studentUserId: { in: demoUserIds } },
    });
  }
  await prisma.affiliateCommission.deleteMany({
    where: { organizationId: orgId, eventId, orderRef: { startsWith: ORDER_REF_PREFIX } },
  });
  // Deleting partners cascades their links, commissions and payouts.
  await prisma.affiliatePartner.deleteMany({
    where: { organizationId: orgId, email: { endsWith: `@${DEMO_DOMAIN}` } },
  });
  await prisma.affiliateProgram.deleteMany({
    where: { organizationId: orgId, name: { endsWith: DEMO_TAG } },
  });
  await prisma.eventExpense.deleteMany({
    where: { organizationId: orgId, eventId, category: "promotions", notes: DEMO_TAG },
  });
  await prisma.coupon.deleteMany({ where: { description: DEMO_TAG } });
}

async function ensureTickets(orgId, eventId) {
  const tickets = await prisma.lmsEventTicket.findMany({ where: { organizationId: orgId, eventId } });
  let general = tickets.find((t) => !isBonusTicket(t));
  let bonus = tickets.find((t) => isBonusTicket(t));
  if (!general) {
    general = await prisma.lmsEventTicket.create({
      data: {
        organizationId: orgId, eventId, name: "General admission",
        description: "Includes bingo cards and one guaranteed take-home plant.",
        price: 30, currency: "USD", ticketStatus: "available",
        createdById: orgId, updatedById: orgId,
      },
    });
  }
  if (!bonus) {
    bonus = await prisma.lmsEventTicket.create({
      data: {
        organizationId: orgId, eventId, name: EXTRA_BINGO_CARD_TICKET_NAME,
        description: BONUS_CARD_TICKET_DESCRIPTION,
        price: 5, currency: "USD", ticketStatus: "available",
        createdById: orgId, updatedById: orgId,
      },
    });
  }
  return { general, bonus };
}

async function main() {
  const event = await resolveEvent();
  if (!event) {
    console.error("[mkt-demo] Could not resolve target event. Pass --event-id or --slug.");
    process.exit(1);
  }
  const orgId = event.organizationId;
  const eventId = event.id;
  const currency = event.currency || "USD";
  console.log(`[mkt-demo] Event #${eventId} "${event.title}" (org ${orgId})`);

  await cleanup(orgId, eventId);

  const { general, bonus } = await ensureTickets(orgId, eventId);

  // 1) Affiliate program + partners + links
  const program = await prisma.affiliateProgram.create({
    data: {
      organizationId: orgId,
      name: `Greenhouse Affiliate Program ${DEMO_TAG}`,
      description: "Partner referral program for Plant Bingo nights.",
      commissionType: "percentage",
      commissionValue: 12,
      status: "active",
      updatedAt: new Date(),
    },
  });

  const partners = {};
  for (const a of AFFILIATES) {
    const partner = await prisma.affiliatePartner.create({
      data: {
        organizationId: orgId,
        name: a.name,
        email: `${a.key}@${DEMO_DOMAIN}`,
        referralCode: a.referralCode,
        tier: "standard",
        status: "active",
        commissionRate: a.commissionRate,
        totalClicks: 0,
        totalConversions: 0,
        lifetimeEarnings: 0,
        updatedAt: new Date(),
      },
    });
    const link = await prisma.affiliateLink.create({
      data: {
        organizationId: orgId,
        partnerId: partner.id,
        programId: program.id,
        label: `${a.name} — ${event.title}`,
        destinationUrl: `/events/${event.slug}`,
        slug: `${a.key}-${eventId}`,
        trackingUrl: `https://ref.thesocialgreenhouse.test/${a.key}-${eventId}`,
        status: "active",
        clickCount: 0,
        updatedAt: new Date(),
      },
    });
    partners[a.key] = { partner, link, def: a, regs: 0 };
  }
  const partnerKeys = Object.keys(partners);

  // 2) Coupons (find-or-create; tag new ones so cleanup only removes demo rows)
  const couponByCode = {};
  for (const c of COUPONS) {
    let coupon = await prisma.coupon.findUnique({ where: { code: c.code } });
    if (!coupon) {
      coupon = await prisma.coupon.create({
        data: {
          name: c.name,
          description: DEMO_TAG,
          code: c.code,
          discount: c.discount,
          type: c.type,
          status: true,
          expiryDate: daysAgo(-30),
          createdBy: orgId,
        },
      });
    }
    couponByCode[c.code] = coupon;
  }

  // 3) Registrations + transactions across every attribution bucket
  const REFERRAL_NAMES = ["ANNA", "MARK", "PRIYA", "DIEGO", "SARA", "TOM", "NINA", "OMAR", "LEA", "KAI"];
  let userSeq = 0;
  let totalRegs = 0;
  let checkedIn = 0;
  let paidCount = 0;
  const affiliateCommissionData = [];
  const spanDays = 11; // spread registrations across the last ~11 days

  for (const step of PLAN) {
    for (let j = 0; j < step.count; j++) {
      userSeq += 1;
      const i = userSeq;
      const userId = USER_ID_BASE + BigInt(i);
      const first = pick(FIRST_NAMES, i);
      const last = pick(LAST_NAMES, i * 7 + 3);
      const name = `${first} ${last}`;
      const email = `mkt-${i}@${DEMO_DOMAIN}`;

      await prisma.user.upsert({
        where: { id: userId },
        update: { name, email, isActive: true },
        create: {
          id: userId, name, email, type: "client",
          isActive: true, isEnableLogin: false, createdBy: Number(orgId),
        },
      });

      // Attribution fields per bucket
      const attr = {
        registrationSource: null, sourceName: null, campaignId: step.campaign,
        affiliatePartnerId: null, affiliateLinkId: null, referralCode: null,
        couponId: null, couponCode: null,
        utmSource: null, utmMedium: null, utmCampaign: step.campaign,
      };

      if (step.bucket === "affiliate") {
        const key = pick(partnerKeys, j);
        const p = partners[key];
        p.regs += 1;
        attr.affiliatePartnerId = p.partner.id;
        attr.affiliateLinkId = p.link.id;
        attr.registrationSource = "affiliate";
        attr.sourceName = p.def.name;
        attr.utmMedium = "affiliate";
      } else if (step.bucket === "promotion_code") {
        const c = pick(COUPONS, j);
        const coupon = couponByCode[c.code];
        attr.couponId = coupon.id;
        attr.couponCode = c.code;
        attr.registrationSource = "promotion_code";
        attr.sourceName = c.name;
      } else if (step.bucket === "customer_referral") {
        attr.referralCode = `FRIEND-${pick(REFERRAL_NAMES, j)}`;
        attr.registrationSource = "customer_referral";
        attr.sourceName = "Friend referral";
      } else if (step.bucket === "venue_website") {
        attr.registrationSource = "venue_website";
        attr.sourceName = "Venue website";
      } else if (step.bucket === "venue_qr") {
        attr.registrationSource = "venue_qr";
        attr.sourceName = "Table QR code";
      } else if (step.bucket === "facebook") {
        attr.utmSource = "facebook"; attr.utmMedium = "social"; attr.sourceName = "Facebook";
        attr.registrationSource = "social";
      } else if (step.bucket === "instagram") {
        attr.utmSource = "instagram"; attr.utmMedium = "social"; attr.sourceName = "Instagram";
        attr.registrationSource = "social";
      } else if (step.bucket === "google") {
        attr.utmSource = "google"; attr.utmMedium = "cpc"; attr.sourceName = "Google Ads";
        attr.registrationSource = "paid_search";
      } else if (step.bucket === "email") {
        attr.utmSource = "mailchimp"; attr.utmMedium = "email"; attr.sourceName = "Newsletter";
        attr.registrationSource = "email";
      } else if (step.bucket === "organic") {
        attr.registrationSource = "organic"; attr.sourceName = "Organic search";
        attr.utmCampaign = null; attr.campaignId = null;
      } else if (step.bucket === "direct") {
        attr.registrationSource = "direct"; attr.sourceName = "Direct";
        attr.utmCampaign = null; attr.campaignId = null;
      }

      // Timing spread across the window
      const dayOffset = spanDays - Math.floor((totalRegs / 238) * spanDays);
      const regAt = daysAgo(dayOffset, 9 + (i % 11), (i * 7) % 60);

      // Ticket / payment (mostly paid general admission, some bonus, few unpaid)
      let ticketId = general.id;
      let amountPaid = 30;
      let bookingStatus = "confirmed";
      let paymentStatus = "paid";
      let checkedInAt = null;

      if (i % 11 === 0) {
        ticketId = bonus.id;
        amountPaid = 5;
      }
      if (i % 17 === 0) {
        bookingStatus = "pending";
        paymentStatus = "unpaid";
        amountPaid = 0;
      }
      // A portion checked in
      if (paymentStatus === "paid" && i % 3 === 0) {
        checkedInAt = daysAgo(0, 18, (i * 3) % 60);
        bookingStatus = "checked_in";
        checkedIn += 1;
      }

      const reg = await prisma.lmsEventRegistration.create({
        data: {
          organizationId: orgId, eventId, ticketId, studentUserId: userId,
          bookingStatus, attendeeName: name, attendeeEmail: email,
          paymentStatus, amountPaid, currency,
          registeredAt: regAt, checkedInAt,
          qrToken: `QR-MKT-${eventId}-${i}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          registrationSource: attr.registrationSource,
          sourceName: attr.sourceName,
          campaignId: attr.campaignId,
          affiliatePartnerId: attr.affiliatePartnerId,
          affiliateLinkId: attr.affiliateLinkId,
          referralCode: attr.referralCode,
          couponId: attr.couponId,
          couponCode: attr.couponCode,
          utmSource: attr.utmSource,
          utmMedium: attr.utmMedium,
          utmCampaign: attr.utmCampaign,
          firstTouchAt: regAt,
          lastTouchAt: regAt,
          createdById: orgId,
          updatedById: orgId,
        },
      });
      totalRegs += 1;

      if (amountPaid > 0 && paymentStatus === "paid") {
        paidCount += 1;
        await prisma.lmsEventTransaction.create({
          data: {
            organizationId: orgId, eventId, registrationId: reg.id,
            attendeeName: name, amount: amountPaid, currency,
            method: pick(["card", "card", "card", "cash"], i),
            status: "completed", processedAt: regAt,
            createdById: orgId, updatedById: orgId,
          },
        });

        // Affiliate commission for affiliate-attributed paid registrations
        if (attr.affiliatePartnerId) {
          const key = partnerKeys.find((k) => partners[k].partner.id === attr.affiliatePartnerId);
          const rate = partners[key].def.commissionRate;
          const amt = new Prisma.Decimal(amountPaid).mul(rate).div(100);
          affiliateCommissionData.push({
            organizationId: orgId,
            partnerId: attr.affiliatePartnerId,
            programId: program.id,
            orderRef: `${ORDER_REF_PREFIX}${reg.id}`,
            customerEmail: email,
            eventId,
            registrationId: reg.id,
            amount: amt,
            currency,
            status: pick(["approved", "approved", "paid", "pending"], i),
            earnedAt: regAt,
          });
        }
      }
    }
  }

  // 4) Persist affiliate commissions + roll up partner totals
  if (affiliateCommissionData.length) {
    await prisma.affiliateCommission.createMany({ data: affiliateCommissionData });
  }
  for (const key of partnerKeys) {
    const p = partners[key];
    const clicks = Math.max(p.regs, Math.round(p.regs * (3 + (p.partner.id % 3n === 0n ? 2 : 1))));
    const earnings = affiliateCommissionData
      .filter((c) => c.partnerId === p.partner.id)
      .reduce((s, c) => s.add(c.amount), new Prisma.Decimal(0));
    await prisma.affiliatePartner.update({
      where: { id: p.partner.id },
      data: { totalClicks: clicks, totalConversions: p.regs, lifetimeEarnings: earnings, updatedAt: new Date() },
    });
    await prisma.affiliateLink.update({ where: { id: p.link.id }, data: { clickCount: clicks, updatedAt: new Date() } });
  }

  // 5) Promotions ad-spend expenses
  for (const e of PROMO_EXPENSES) {
    await prisma.eventExpense.create({
      data: {
        organizationId: orgId, eventId, category: "promotions",
        payeeName: e.payeeName, description: e.description,
        quantity: 1, unitCost: e.total, subtotal: e.total, tax: 0, total: e.total,
        currency, paymentStatus: "paid", paidAt: daysAgo(6),
        notes: DEMO_TAG, createdById: orgId, updatedById: orgId,
      },
    });
  }

  // 6) Keep event denormalized totals consistent with actual rows
  const [validCount, txAgg] = await Promise.all([
    prisma.lmsEventRegistration.count({ where: { organizationId: orgId, eventId, bookingStatus: { notIn: ["cancelled", "refunded"] } } }),
    prisma.lmsEventTransaction.aggregate({ where: { organizationId: orgId, eventId, status: { in: ["completed", "paid"] } }, _sum: { amount: true } }),
  ]);
  await prisma.lmsTrainingEvent.update({
    where: { id: eventId },
    data: { registeredCount: validCount, revenueTotal: txAgg._sum.amount ?? 0, updatedAt: new Date() },
  });

  const adSpend = PROMO_EXPENSES.reduce((s, e) => s + e.total, 0);
  console.log("[mkt-demo] Done.");
  console.log(`  Registrations: ${totalRegs} (${checkedIn} checked in, ${paidCount} paid)`);
  console.log(`  Affiliates: ${partnerKeys.length} partners, ${affiliateCommissionData.length} commissions`);
  console.log(`  Coupons: ${COUPONS.length}, promotions ad spend: $${adSpend.toFixed(2)}`);
  console.log(`  Event registeredCount=${validCount}, revenueTotal=$${Number(txAgg._sum.amount ?? 0).toFixed(2)}`);
}

main()
  .catch((err) => {
    console.error("[mkt-demo] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
