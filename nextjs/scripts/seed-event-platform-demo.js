/* eslint-disable no-console */
/**
 * Seed Event Platform demo data: vendors, commission rules, ledger, payouts,
 * monthly transactions (for dashboard chart), CMS pages, popups, menus, seat maps.
 *
 * Prereq: npm run db:ensure:event-platform && npx prisma generate
 * Usage:  npm run db:seed:event-platform
 *         npm run db:seed:event-platform -- --name="First Aid Responders"
 *         npm run db:seed:event-platform -- --email=crimson@mailsac.com
 */

const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();
const DEMO_MARKER = "[ep-demo-seed]";
const TX_ATTENDEE_PREFIX = "EP-DEMO";

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

function parseBigint(v, fallback) {
  try {
    return BigInt(String(v).trim());
  } catch {
    return fallback;
  }
}

function monthsAgo(n, day = 15) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  d.setHours(12, 0, 0, 0);
  return d;
}

function commissionSplit(gross, ratePct) {
  const grossDec = new Prisma.Decimal(gross);
  const platformCommission = grossDec.mul(ratePct).div(100);
  const vendorNet = grossDec.sub(platformCommission);
  return { grossDec, platformCommission, vendorNet };
}

async function findCompany() {
  if (!FILTER_EMAIL && !FILTER_NAME) {
    const orgId = parseBigint(process.env.EP_SEED_ORG_ID ?? process.env.LMS_SEED_ORG_ID, 1000n);
    return prisma.user.findFirst({
      where: { id: orgId, type: { in: ["company", "company_admin"] } },
      select: { id: true, email: true, name: true },
    });
  }
  const where = { type: { in: ["company", "company_admin"] }, isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };
  return prisma.user.findFirst({
    where,
    orderBy: { id: "asc" },
    select: { id: true, email: true, name: true },
  });
}

async function upsertVendor(orgId, data) {
  const existing = await prisma.eventVendor.findFirst({
    where: { organizationId: orgId, email: data.email },
  });
  const payload = {
    organizationId: orgId,
    vendorName: data.vendorName,
    companyName: data.companyName,
    contactName: data.contactName,
    email: data.email,
    phone: data.phone,
    website: data.website,
    businessType: data.businessType,
    status: data.status,
    defaultCommissionRate: data.defaultCommissionRate,
    payoutMethod: data.payoutMethod,
    city: data.city,
    state: data.state,
    country: "US",
    notes: DEMO_MARKER,
    createdById: orgId,
    updatedById: orgId,
    updatedAt: new Date(),
  };
  if (existing) {
    return prisma.eventVendor.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.eventVendor.create({ data: payload });
}

async function cleanupDemoData(orgId, vendorIds) {
  if (vendorIds.length === 0) return;

  const ledgerIds = (
    await prisma.eventCommissionLedger.findMany({
      where: { organizationId: orgId, vendorId: { in: vendorIds } },
      select: { id: true },
    })
  ).map((r) => r.id);

  const payoutIds = (
    await prisma.eventVendorPayout.findMany({
      where: { organizationId: orgId, vendorId: { in: vendorIds } },
      select: { id: true },
    })
  ).map((r) => r.id);

  if (payoutIds.length) {
    await prisma.eventVendorPayoutItem.deleteMany({ where: { payoutId: { in: payoutIds } } });
    await prisma.eventVendorPayout.deleteMany({ where: { id: { in: payoutIds } } });
  }
  if (ledgerIds.length) {
    await prisma.eventCommissionLedger.deleteMany({ where: { id: { in: ledgerIds } } });
  }

  await prisma.eventVendorCommissionRule.deleteMany({
    where: { organizationId: orgId, vendorId: { in: vendorIds } },
  });

  await prisma.lmsEventTransaction.deleteMany({
    where: {
      organizationId: orgId,
      attendeeName: { startsWith: TX_ATTENDEE_PREFIX },
    },
  });
}

async function ensureDemoTransaction(orgId, event, registrationId, amount, processedAt, label) {
  const attendeeName = `${TX_ATTENDEE_PREFIX} ${label}`;
  const existing = await prisma.lmsEventTransaction.findFirst({
    where: { organizationId: orgId, attendeeName, eventId: event.id },
  });
  if (existing) {
    return prisma.lmsEventTransaction.update({
      where: { id: existing.id },
      data: { amount, processedAt, status: "completed", updatedAt: new Date() },
    });
  }
  return prisma.lmsEventTransaction.create({
    data: {
      organizationId: orgId,
      eventId: event.id,
      registrationId,
      attendeeName,
      amount,
      currency: "USD",
      method: "card",
      status: "completed",
      processedAt,
      createdById: orgId,
      updatedById: orgId,
    },
  });
}

async function main() {
  await prisma.$queryRaw`SELECT 1 FROM event_vendors LIMIT 1`.catch(() => {
    console.error("[seed-event-platform] Run: node ./scripts/ensure-event-platform-schema.js && npx prisma generate");
    process.exit(1);
  });

  const company = await findCompany();
  if (!company) {
    console.error(
      '[seed-event-platform] No company found. Use --name="First Aid Responders", --email=..., or EP_SEED_ORG_ID.',
    );
    process.exit(1);
  }

  const orgId = company.id;
  console.log(`[seed-event-platform] Organization: ${company.name} (${company.id})`);

  const vendors = await Promise.all([
    upsertVendor(orgId, {
      vendorName: "Metro CPR Training Co",
      companyName: "Metro CPR Training Co",
      contactName: "Sarah Mitchell",
      email: "ep-demo+metro@firstaid.test",
      phone: "555-0101",
      website: "https://metro-cpr.example.com",
      businessType: "training_provider",
      status: "active",
      defaultCommissionRate: 12,
      payoutMethod: "ach",
      city: "Jacksonville",
      state: "FL",
    }),
    upsertVendor(orgId, {
      vendorName: "SafeGuard Event Services",
      companyName: "SafeGuard Event Services LLC",
      contactName: "James Rivera",
      email: "ep-demo+safeguard@firstaid.test",
      phone: "555-0102",
      website: "https://safeguard-events.example.com",
      businessType: "event_organizer",
      status: "active",
      defaultCommissionRate: 15,
      payoutMethod: "paypal",
      city: "Orlando",
      state: "FL",
    }),
    upsertVendor(orgId, {
      vendorName: "Coastal Medical Workshops",
      companyName: "Coastal Medical Workshops",
      contactName: "Dr. Amy Chen",
      email: "ep-demo+coastal@firstaid.test",
      phone: "555-0103",
      website: "https://coastal-med.example.com",
      businessType: "medical_training",
      status: "active",
      defaultCommissionRate: 10,
      payoutMethod: "ach",
      city: "Tampa",
      state: "FL",
    }),
    upsertVendor(orgId, {
      vendorName: "Tri-State Training LLC",
      companyName: "Tri-State Training LLC",
      contactName: "Mark Owens",
      email: "ep-demo+tristate@firstaid.test",
      phone: "555-0104",
      website: null,
      businessType: "training_provider",
      status: "pending",
      defaultCommissionRate: 12,
      payoutMethod: "check",
      city: "Atlanta",
      state: "GA",
    }),
    upsertVendor(orgId, {
      vendorName: "First Aid Academy South",
      companyName: "First Aid Academy South",
      contactName: "Lisa Park",
      email: "ep-demo+academy@firstaid.test",
      phone: "555-0105",
      website: "https://fa-academy.example.com",
      businessType: "training_provider",
      status: "suspended",
      defaultCommissionRate: 10,
      payoutMethod: "ach",
      city: "Miami",
      state: "FL",
    }),
    upsertVendor(orgId, {
      vendorName: "Emergency Skills Institute",
      companyName: "Emergency Skills Institute",
      contactName: "Robert Hayes",
      email: "ep-demo+esi@firstaid.test",
      phone: "555-0106",
      website: "https://esi-training.example.com",
      businessType: "medical_training",
      status: "active",
      defaultCommissionRate: 10,
      payoutMethod: "ach",
      city: "Fort Lauderdale",
      state: "FL",
    }),
    upsertVendor(orgId, {
      vendorName: "ProMed Event Partners",
      companyName: "ProMed Event Partners",
      contactName: "Nina Brooks",
      email: "ep-demo+promed@firstaid.test",
      phone: "555-0107",
      website: "https://promed-events.example.com",
      businessType: "event_organizer",
      status: "pending",
      defaultCommissionRate: 14,
      payoutMethod: "paypal",
      city: "St. Petersburg",
      state: "FL",
    }),
  ]);

  const vendorIds = vendors.map((v) => v.id);
  await cleanupDemoData(orgId, vendorIds);

  const events = await prisma.lmsTrainingEvent.findMany({
    where: { organizationId: orgId, status: { not: "draft" } },
    orderBy: { startsAt: "asc" },
    take: 6,
    select: { id: true, title: true, slug: true },
  });

  if (events.length === 0) {
    console.warn("[seed-event-platform] No LMS events found. Run: npm run db:seed:lms-events");
  }

  const [metro, safeguard, coastal] = vendors;

  for (let i = 0; i < Math.min(events.length, 3); i++) {
    const event = events[i];
    const vendor = [metro, safeguard, coastal][i];
    const rate = [12, 15, 10][i];
    await prisma.eventVendorCommissionRule.create({
      data: {
        organizationId: orgId,
        vendorId: vendor.id,
        eventId: event.id,
        commissionRate: rate,
        isActive: true,
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }

  const registrations = await prisma.lmsEventRegistration.findMany({
    where: { organizationId: orgId },
    take: 3,
    orderBy: { id: "asc" },
    select: { id: true, eventId: true },
  });

  const ledgerSpecs = [
    { vendor: metro, event: events[0], gross: 149, monthsAgo: 5, label: "Metro CPR Jan" },
    { vendor: metro, event: events[0], gross: 298, monthsAgo: 4, label: "Metro CPR Feb" },
    { vendor: safeguard, event: events[1] ?? events[0], gross: 199, monthsAgo: 3, label: "SafeGuard Mar" },
    { vendor: safeguard, event: events[1] ?? events[0], gross: 398, monthsAgo: 2, label: "SafeGuard Apr" },
    { vendor: coastal, event: events[2] ?? events[0], gross: 249, monthsAgo: 1, label: "Coastal May" },
    { vendor: coastal, event: events[2] ?? events[0], gross: 149, monthsAgo: 0, label: "Coastal Jun" },
    { vendor: metro, event: events[0], gross: 89, monthsAgo: 0, label: "Metro CPR Jun" },
  ];

  for (const spec of ledgerSpecs) {
    if (!spec.event) continue;
    const rate = spec.vendor.id === metro.id ? 12 : spec.vendor.id === safeguard.id ? 15 : 10;
    const { grossDec, platformCommission, vendorNet } = commissionSplit(spec.gross, rate);
    const createdAt = monthsAgo(spec.monthsAgo);

    await prisma.eventCommissionLedger.create({
      data: {
        organizationId: orgId,
        vendorId: spec.vendor.id,
        eventId: spec.event.id,
        grossAmount: grossDec,
        platformCommission,
        vendorNet,
        currency: "USD",
        status: "pending",
        createdAt,
        updatedAt: createdAt,
        createdById: orgId,
        updatedById: orgId,
      },
    });

    const regId = registrations.find((r) => r.eventId === spec.event.id)?.id;
    if (regId) {
      await ensureDemoTransaction(orgId, spec.event, regId, spec.gross, createdAt, spec.label);
    }
  }

  const coastalPending = await prisma.eventCommissionLedger.findMany({
    where: { organizationId: orgId, vendorId: coastal.id, status: "pending" },
  });

  if (coastalPending.length >= 2) {
    const batchTotal = coastalPending.reduce((s, e) => s.add(e.vendorNet), new Prisma.Decimal(0));
    const paidAt = monthsAgo(2);
    const payout = await prisma.eventVendorPayout.create({
      data: {
        organizationId: orgId,
        vendorId: coastal.id,
        batchRef: `EP-DEMO-${Date.now().toString(36).toUpperCase()}`,
        totalAmount: batchTotal,
        currency: "USD",
        status: "paid",
        paidAt,
        notes: DEMO_MARKER,
        createdAt: paidAt,
        updatedAt: paidAt,
        createdById: orgId,
        updatedById: orgId,
      },
    });

    for (const entry of coastalPending.slice(0, 2)) {
      await prisma.eventVendorPayoutItem.create({
        data: { payoutId: payout.id, ledgerId: entry.id, amount: entry.vendorNet },
      });
      await prisma.eventCommissionLedger.update({
        where: { id: entry.id },
        data: { status: "paid", payoutId: payout.id, paidAt, updatedAt: new Date() },
      });
    }
  }

  const metroPending = await prisma.eventCommissionLedger.findMany({
    where: { organizationId: orgId, vendorId: metro.id, status: "pending" },
  });

  if (metroPending.length > 0) {
    const batchTotal = metroPending.reduce((s, e) => s.add(e.vendorNet), new Prisma.Decimal(0));
    const payout = await prisma.eventVendorPayout.create({
      data: {
        organizationId: orgId,
        vendorId: metro.id,
        batchRef: `EP-PEND-${Date.now().toString(36).toUpperCase()}`,
        totalAmount: batchTotal,
        currency: "USD",
        status: "pending",
        notes: DEMO_MARKER,
        createdById: orgId,
        updatedById: orgId,
      },
    });

    for (const entry of metroPending) {
      await prisma.eventVendorPayoutItem.create({
        data: { payoutId: payout.id, ledgerId: entry.id, amount: entry.vendorNet },
      });
      await prisma.eventCommissionLedger.update({
        where: { id: entry.id },
        data: { status: "batched", payoutId: payout.id, updatedAt: new Date() },
      });
    }
  }

  await prisma.eventCustomPage.upsert({
    where: {
      organizationId_slug: { organizationId: orgId, slug: "ep-demo-about" },
    },
    create: {
      organizationId: orgId,
      title: "About Our Events",
      slug: "ep-demo-about",
      contentHtml: "<p>First Aid Responders hosts certification events across Florida.</p>",
      status: "published",
      visibility: "public",
      publishedAt: new Date(),
      createdById: orgId,
      updatedById: orgId,
    },
    update: {
      title: "About Our Events",
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
      updatedById: orgId,
    },
  });

  const popupExisting = await prisma.eventAnnouncementPopup.findFirst({
    where: { organizationId: orgId, title: "Summer training discount" },
  });
  if (!popupExisting) {
    await prisma.eventAnnouncementPopup.create({
      data: {
        organizationId: orgId,
        title: "Summer training discount",
        popupType: "text",
        contentHtml: "<p>Save 15% on CPR recertification this month. Use code <strong>SUMMER15</strong>.</p>",
        buttonText: "Browse events",
        buttonUrl: "/lms/events",
        isActive: true,
        priorityOrder: 1,
        displayLocation: "event_catalog",
        frequency: "once_per_session",
        audience: "all",
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }

  const menuExisting = await prisma.eventMenu.findFirst({
    where: { organizationId: orgId, name: "Event Platform Header" },
  });
  if (!menuExisting) {
    const menu = await prisma.eventMenu.create({
      data: {
        organizationId: orgId,
        name: "Event Platform Header",
        location: "header",
        isActive: true,
        createdById: orgId,
        updatedById: orgId,
      },
    });
    await prisma.eventMenuItem.createMany({
      data: [
        { menuId: menu.id, label: "Browse Events", itemType: "url", url: "/lms/events", sortOrder: 0 },
        { menuId: menu.id, label: "My Events", itemType: "url", url: "/lms/my-events", sortOrder: 1 },
        { menuId: menu.id, label: "About", itemType: "url", url: "/pages/ep-demo-about", sortOrder: 2 },
      ],
    });
  }

  const seatmapExisting = await prisma.eventSeatmapTemplate.findFirst({
    where: { organizationId: orgId, name: "Demo Auditorium — 24 seats" },
  });
  if (!seatmapExisting) {
    await prisma.eventSeatmapTemplate.create({
      data: {
        organizationId: orgId,
        name: "Demo Auditorium — 24 seats",
        description: "Sample 3-row auditorium layout for ticketed workshops.",
        layoutJson: {
          sections: [
            {
              id: "sec-a",
              label: "Orchestra",
              rows: [
                {
                  id: "row-a",
                  label: "A",
                  seats: Array.from({ length: 8 }, (_, i) => ({
                    id: `a-${i + 1}`,
                    label: `A${i + 1}`,
                    status: "available",
                  })),
                },
                {
                  id: "row-b",
                  label: "B",
                  seats: Array.from({ length: 8 }, (_, i) => ({
                    id: `b-${i + 1}`,
                    label: `B${i + 1}`,
                    status: "available",
                  })),
                },
                {
                  id: "row-c",
                  label: "C",
                  seats: Array.from({ length: 8 }, (_, i) => ({
                    id: `c-${i + 1}`,
                    label: `C${i + 1}`,
                    status: "available",
                  })),
                },
              ],
            },
          ],
          tiers: [{ id: "standard", name: "Standard", price: 149, color: "#dc2626" }],
        },
        status: "active",
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }

  const pendingCommission = await prisma.eventCommissionLedger.aggregate({
    where: { organizationId: orgId, status: "pending" },
    _sum: { platformCommission: true },
  });

  console.log("[seed-event-platform] Done.");
  console.log(`  Vendors: ${vendors.length} (${vendors.filter((v) => v.status === "active").length} active)`);
  console.log(`  Commission rules: ${Math.min(events.length, 3)}`);
  console.log(`  Ledger entries + chart transactions seeded`);
  console.log(`  Pending platform commission: $${Number(pendingCommission._sum.platformCommission ?? 0).toFixed(2)}`);
  console.log("  Also: 1 paid payout, 1 pending payout, CMS page, popup, menu, seat map");
}

main()
  .catch((err) => {
    console.error("[seed-event-platform] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
