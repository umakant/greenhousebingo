/* eslint-disable no-console */
// Seeds non-destructive demo data for the Partnership module.
// Safe to re-run: it upserts a dedicated test partner + login and only creates
// test companies / referrals / commissions / payouts that belong to that partner.
//
//   npm run db:seed:partnership-test
//   npm run db:demo:partnership
//
// Test partner login:  testpartner@example.com  /  partner123

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const {
  prisma,
  nextId,
  nextOwnershipId,
  upsertOwnershipBrand,
  upsertOwnershipHolder,
  ensureOwnershipHistory,
  ensurePartnershipPermissions,
  repairSecurXOwnershipIfNeeded,
  disconnect,
} = require("./partnership-seed-shared");

const USER_MODEL_TYPE = "App\\Models\\User";
const PARTNER_EMAIL = "testpartner@example.com";
const PARTNER_PASSWORD = "partner123";
const PARTNER_SLUG = "acme-growth";
const PARTNER_REFERRAL_CODE = "ACME-GROWTH";

async function seedBrandOwnershipTestData({ partnerId }) {
  console.log("\nSeeding Brand Ownership test data...");

  const superadmin = await prisma.user.findFirst({
    where: { email: "superadmin@example.com" },
    select: { id: true },
  });
  const changedByUserId = superadmin?.id ?? null;

  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };

  // ---- SecurX: 20 / 40 / 40 (matches UI mockup) ----------------------------
  const securx = await upsertOwnershipBrand({
    slug: "securx",
    name: "SecurX",
    status: "active",
    notes: "Primary platform brand — seeded test data.",
  });

  const securxHoldings = await upsertOwnershipHolder(securx.id, {
    name: "SecurX Holdings",
    email: "holdings@securx.test",
    current: 20,
    minimum: 20,
    isPrimary: true,
    referralCode: "SECURX-HOLD",
    createdAt: daysAgo(120),
  });
  const lynn = await upsertOwnershipHolder(securx.id, {
    name: "Lynn Nicely",
    email: "lynn@securx.test",
    phone: "+1 555 0101",
    referralCode: "LYNN-40",
    current: 40,
    minimum: 40,
    partnerId,
    payoutMethod: "paypal",
    payoutEmail: "lynn@securx.test",
    createdAt: daysAgo(90),
  });
  const john = await upsertOwnershipHolder(securx.id, {
    name: "John Hindy",
    email: "john@securx.test",
    phone: "+1 555 0102",
    referralCode: "JOHN-40",
    current: 40,
    minimum: 40,
    payoutMethod: "bank_transfer",
    createdAt: daysAgo(60),
  });

  await ensureOwnershipHistory({
    brandId: securx.id,
    action: "brand_created",
    changedByUserId,
    notes: 'Brand "SecurX" created with primary holder.',
    newCurrent: 100,
    newMinimum: 100,
  });
  await ensureOwnershipHistory({
    brandId: securx.id,
    holderId: securxHoldings.id,
    action: "ownership_updated",
    changedByUserId,
    notes: "Adjusted holdings to 20% after partner allocations.",
    oldCurrent: 100,
    newCurrent: 20,
    oldMinimum: 100,
    newMinimum: 20,
  });
  await ensureOwnershipHistory({
    brandId: securx.id,
    holderId: lynn.id,
    action: "holder_added",
    changedByUserId,
    notes: "Partner Lynn Nicely added at 40%.",
    newCurrent: 40,
    newMinimum: 40,
  });
  await ensureOwnershipHistory({
    brandId: securx.id,
    holderId: john.id,
    action: "holder_added",
    changedByUserId,
    notes: "Partner John Hindy added at 40%.",
    newCurrent: 40,
    newMinimum: 40,
  });

  // Conflict request example (David Wilson 50% when brand is full)
  const conflictRef = "TEST-CONFLICT-DAVID-WILSON";
  const existingConflict = await prisma.ownershipBrandRequest.findFirst({
    where: { brandId: securx.id, partnerName: "David Wilson" },
    select: { id: true },
  });
  if (!existingConflict) {
    await prisma.ownershipBrandRequest.create({
      data: {
        id: await nextOwnershipId("request"),
        brandId: securx.id,
        partnerName: "David Wilson",
        email: "david@example.com",
        phone: "+1 555 0199",
        referralCode: "DAVID-50",
        requestedCurrentOwnership: 50,
        requestedMinimumOwnership: 50,
        status: "conflict",
        conflictDetected: true,
        conflictMessage: "Ownership cannot exceed 100%. Total would become 150%.",
        notes: conflictRef,
        requestedByUserId: changedByUserId,
        createdAt: daysAgo(7),
      },
    });
    console.log("  + ownership conflict request: David Wilson (50%)");
  }

  // ---- Paper Flight: partial allocation (40% available) ----------------------
  const paperFlight = await upsertOwnershipBrand({
    slug: "paper-flight",
    name: "Paper Flight",
    status: "active",
    notes: "Legacy brand name — 60% assigned, 40% available.",
  });
  await upsertOwnershipHolder(paperFlight.id, {
    name: "Paper Flight Holdings",
    email: "holdings@paperflight.test",
    current: 60,
    minimum: 50,
    isPrimary: true,
    createdAt: daysAgo(200),
  });

  // Pending ownership request (Paper Flight — 10% within available 40%)
  const pendingReq = await prisma.ownershipBrandRequest.findFirst({
    where: { brandId: paperFlight.id, partnerName: "Sarah Chen" },
    select: { id: true },
  });
  if (!pendingReq) {
    await prisma.ownershipBrandRequest.create({
      data: {
        id: await nextOwnershipId("request"),
        brandId: paperFlight.id,
        partnerName: "Sarah Chen",
        email: "sarah@example.com",
        requestedCurrentOwnership: 10,
        requestedMinimumOwnership: 10,
        status: "pending",
        conflictDetected: false,
        notes: "Awaiting admin review — valid 10% request.",
        requestedByUserId: changedByUserId,
        createdAt: daysAgo(2),
      },
    });
  }

  // ---- Water Ice Express: 100% primary only ----------------------------------
  const waterIce = await upsertOwnershipBrand({
    slug: "water-ice-express",
    name: "Water Ice Express",
    status: "active",
    notes: "Single-holder brand — full 100% available to split.",
  });
  await upsertOwnershipHolder(waterIce.id, {
    name: "Water Ice Express Holdings",
    email: "holdings@waterice.test",
    current: 100,
    minimum: 100,
    isPrimary: true,
    createdAt: daysAgo(300),
  });

  // ---- Inactive brand for status filter testing ------------------------------
  await upsertOwnershipBrand({
    slug: "legacy-brand",
    name: "Legacy Brand Co",
    status: "inactive",
    notes: "Inactive brand for QA.",
  });

  await repairSecurXOwnershipIfNeeded(partnerId);

  console.log("  Brand ownership: SecurX (100%), Paper Flight (60%), Water Ice Express (100%), Legacy (inactive)");
  console.log("  Ownership requests: 1 conflict (David Wilson), 1 pending (Sarah Chen)");
  console.log("  Ownership history: brand created + holder events for SecurX");
}

async function main() {
  console.log("Seeding Partnership module test data...");

  const { partnerRole } = await ensurePartnershipPermissions();
  const hash = await bcrypt.hash(PARTNER_PASSWORD, 10);
  let loginUser = await prisma.user.findFirst({ where: { email: PARTNER_EMAIL }, select: { id: true } });
  if (!loginUser) {
    const id = await nextId("user");
    loginUser = await prisma.user.create({
      data: {
        id,
        email: PARTNER_EMAIL,
        name: "Acme Growth Partners",
        password: hash,
        type: "partner",
        isActive: true,
        emailVerifiedAt: new Date(),
      },
      select: { id: true },
    });
    console.log(`  + created partner login ${PARTNER_EMAIL} (id ${id})`);
  } else {
    await prisma.user.update({
      where: { id: loginUser.id },
      data: { password: hash, type: "partner", isActive: true },
    });
  }
  await prisma.modelHasRole.createMany({
    data: [{ modelId: loginUser.id, roleId: partnerRole.id, modelType: USER_MODEL_TYPE }],
    skipDuplicates: true,
  });

  // ---- Ensure the Partner profile -------------------------------------------
  let partner = await prisma.partner.findFirst({ where: { slug: PARTNER_SLUG }, select: { id: true } });
  if (!partner) {
    const id = await nextId("partner");
    partner = await prisma.partner.create({
      data: {
        id,
        userId: loginUser.id,
        name: "Acme Growth Partners",
        email: PARTNER_EMAIL,
        phone: "+1 555 0100",
        brandName: "Acme Growth",
        slug: PARTNER_SLUG,
        referralCode: PARTNER_REFERRAL_CODE,
        commissionRate: 15.0,
        status: "active",
        payoutMethod: "paypal",
        payoutEmail: "payouts@acmegrowth.test",
        notes: "Seeded test partner.",
        marketplaceCommissionType: "percentage",
        marketplaceCommissionValue: 5.0,
        createdAt: new Date(),
      },
      select: { id: true },
    });
    console.log(`  + created partner 'Acme Growth Partners' (id ${id})`);
  } else {
    await prisma.partner.update({
      where: { id: partner.id },
      data: {
        userId: loginUser.id,
        status: "active",
        commissionRate: 15.0,
        marketplaceCommissionType: "percentage",
        marketplaceCommissionValue: 5.0,
      },
    });
  }
  const partnerId = partner.id;

  // ---- A second, pending partner (for the Applications screen) --------------
  let pendingPartner = await prisma.partner.findFirst({ where: { slug: "brightleads" }, select: { id: true } });
  if (!pendingPartner) {
    const id = await nextId("partner");
    pendingPartner = await prisma.partner.create({
      data: {
        id,
        name: "Bright Leads Agency",
        email: "hello@brightleads.test",
        brandName: "Bright Leads",
        slug: "brightleads",
        referralCode: "BRIGHT-LEADS",
        status: "pending",
        createdAt: new Date(),
      },
      select: { id: true },
    });
    console.log(`  + created pending application 'Bright Leads Agency' (id ${id})`);
  }

  // ---- Suspended partner (Partners list status variety) ----------------------
  let suspendedPartner = await prisma.partner.findFirst({ where: { slug: "northstar-referrals" }, select: { id: true } });
  if (!suspendedPartner) {
    const id = await nextId("partner");
    suspendedPartner = await prisma.partner.create({
      data: {
        id,
        name: "Northstar Referrals",
        email: "ops@northstar.test",
        brandName: "Northstar",
        slug: "northstar-referrals",
        referralCode: "NORTH-STAR",
        commissionRate: 12.0,
        status: "suspended",
        notes: "Seeded suspended partner for QA.",
        createdAt: new Date(),
      },
      select: { id: true },
    });
    console.log(`  + created suspended partner 'Northstar Referrals' (id ${id})`);
  }

  // ---- Draft landing page (Marketing Pages variety) --------------------------
  const draftLp = await prisma.partnerLandingPage.findFirst({
    where: { partnerId, slug: "fleet-wash" },
    select: { id: true },
  });
  if (!draftLp) {
    await prisma.partnerLandingPage.create({
      data: {
        id: await nextId("partnerLandingPage"),
        partnerId,
        title: "Fleet Wash Program",
        slug: "fleet-wash",
        headline: "Commercial fleet detailing",
        status: "draft",
        createdAt: new Date(),
      },
    });
    console.log("  + created draft landing page fleet-wash");
  }

  // ---- Pick an existing plan id for "paid" companies ------------------------
  const samplePlan = await prisma.plan.findFirst({ select: { id: true }, orderBy: { id: "asc" } }).catch(() => null);
  const paidPlanId = samplePlan ? Number(samplePlan.id) : 1;

  // ---- Test companies referred by the partner -------------------------------
  const companySpecs = [
    { email: "shinydetailing@example.com", name: "Shiny Auto Detailing", refStatus: "active", paid: true },
    { email: "freshcleanpros@example.com", name: "Fresh Clean Pros", refStatus: "active", paid: true },
    { email: "trialgarage@example.com", name: "Trial Garage LLC", refStatus: "trial", paid: false },
    { email: "lostlead@example.com", name: "Lost Lead Co", refStatus: "cancelled", paid: false },
  ];

  const companyIds = [];
  for (const spec of companySpecs) {
    let cu = await prisma.user.findFirst({ where: { email: spec.email }, select: { id: true } });
    if (!cu) {
      const id = await nextId("user");
      cu = await prisma.user.create({
        data: {
          id,
          email: spec.email,
          name: spec.name,
          password: hash,
          type: "company",
          isActive: spec.refStatus !== "cancelled",
          activePlan: spec.paid ? paidPlanId : null,
          partnerId,
          referralSource: `slug:${PARTNER_SLUG}`,
          referredAt: new Date(),
          emailVerifiedAt: new Date(),
        },
        select: { id: true },
      });
    } else {
      await prisma.user.update({
        where: { id: cu.id },
        data: {
          type: "company",
          isActive: spec.refStatus !== "cancelled",
          activePlan: spec.paid ? paidPlanId : null,
          partnerId,
          referralSource: `slug:${PARTNER_SLUG}`,
          referredAt: new Date(),
        },
      });
    }
    companyIds.push({ id: cu.id, ...spec });

    // Referral record
    const existingRef = await prisma.partnerReferral.findFirst({
      where: { partnerId, companyId: cu.id },
      select: { id: true },
    });
    if (!existingRef) {
      await prisma.partnerReferral.create({
        data: {
          id: await nextId("partnerReferral"),
          partnerId,
          companyId: cu.id,
          referralCode: PARTNER_REFERRAL_CODE,
          partnerSlug: PARTNER_SLUG,
          sourceUrl: `https://app.local/p/${PARTNER_SLUG}`,
          signupDate: new Date(),
          referralStatus: spec.refStatus,
          createdAt: new Date(),
        },
      });
    } else {
      await prisma.partnerReferral.update({
        where: { id: existingRef.id },
        data: { referralStatus: spec.refStatus },
      });
    }
  }
  console.log(`  + ${companyIds.length} test companies attributed + referrals recorded`);

  // ---- Commissions -----------------------------------------------------------
  // Two paid companies generate commissions. We create a mix of statuses.
  const rate = 15.0;
  const commissionSpecs = [
    { company: companyIds[0], amount: 200.0, status: "paid", ref: "TEST-ORD-1001" },
    { company: companyIds[0], amount: 200.0, status: "approved", ref: "TEST-ORD-1002" },
    { company: companyIds[1], amount: 120.0, status: "pending", ref: "TEST-ORD-1003" },
    { company: companyIds[1], amount: 120.0, status: "paid", ref: "TEST-ORD-1004" },
  ];

  // Ensure a paid payout exists to attach paid commissions to.
  let payout = await prisma.partnerPayout.findFirst({
    where: { partnerId, payoutReference: "TEST-PAYOUT-1" },
    select: { id: true },
  });
  if (!payout) {
    payout = await prisma.partnerPayout.create({
      data: {
        id: await nextId("partnerPayout"),
        partnerId,
        totalAmount: 0, // updated below after we know paid total
        status: "paid",
        payoutMethod: "paypal",
        payoutReference: "TEST-PAYOUT-1",
        notes: "Seeded paid payout batch.",
        paidAt: new Date(),
        createdAt: new Date(),
      },
      select: { id: true },
    });
  }

  let paidTotal = 0;
  for (const spec of commissionSpecs) {
    const commissionAmount = Number(((spec.amount * rate) / 100).toFixed(2));
    const existing = await prisma.partnerCommission.findFirst({
      where: { orderRef: spec.ref },
      select: { id: true },
    });
    const data = {
      partnerId,
      companyId: spec.company.id,
      orderRef: spec.ref,
      amount: spec.amount,
      commissionRate: rate,
      commissionAmount,
      status: spec.status,
      payoutId: spec.status === "paid" ? payout.id : null,
      paidAt: spec.status === "paid" ? new Date() : null,
    };
    if (!existing) {
      await prisma.partnerCommission.create({ data: { id: await nextId("partnerCommission"), createdAt: new Date(), ...data } });
    } else {
      await prisma.partnerCommission.update({ where: { id: existing.id }, data });
    }
    if (spec.status === "paid") paidTotal += commissionAmount;
  }
  await prisma.partnerPayout.update({ where: { id: payout.id }, data: { totalAmount: paidTotal } });
  console.log(`  + 4 commissions created (paid payout total ${paidTotal})`);

  // A pending payout to show in the payouts queue.
  const pendingPayout = await prisma.partnerPayout.findFirst({
    where: { partnerId, payoutReference: "TEST-PAYOUT-2" },
    select: { id: true },
  });
  if (!pendingPayout) {
    await prisma.partnerPayout.create({
      data: {
        id: await nextId("partnerPayout"),
        partnerId,
        totalAmount: 30.0,
        status: "pending",
        payoutMethod: "paypal",
        payoutReference: "TEST-PAYOUT-2",
        notes: "Seeded pending payout.",
        createdAt: new Date(),
      },
    });
  }

  // ---- Landing page ----------------------------------------------------------
  const existingLp = await prisma.partnerLandingPage.findFirst({
    where: { partnerId, slug: "mobile-detailing" },
    select: { id: true },
  });
  if (!existingLp) {
    await prisma.partnerLandingPage.create({
      data: {
        id: await nextId("partnerLandingPage"),
        partnerId,
        title: "Mobile Detailing Software",
        slug: "mobile-detailing",
        headline: "Run your detailing business on autopilot",
        subheadline: "Booking, invoicing, and CRM built for mobile detailers.",
        industryModule: "mobile-detailing",
        description: "Everything Acme Growth recommends to grow your detailing shop.",
        callToActionText: "Start free trial",
        status: "active",
        createdAt: new Date(),
      },
    });
    console.log("  + created landing page /p/acme-growth/mobile-detailing");
  }

  await seedBrandOwnershipTestData({ partnerId });

  console.log("\nDone. Test data summary:");
  console.log(`  Partner:        Acme Growth Partners  (slug: ${PARTNER_SLUG}, code: ${PARTNER_REFERRAL_CODE})`);
  console.log(`  Partner login:  ${PARTNER_EMAIL} / ${PARTNER_PASSWORD}`);
  console.log(`  Referral link:  /signup?partner=${PARTNER_SLUG}   and   /p/${PARTNER_SLUG}`);
  console.log("  Pending app:    Bright Leads Agency (Applications screen)");
  console.log("  Companies:      4 referred (2 paid, 1 trial, 1 cancelled)");
  console.log("  Commissions:    2 paid, 1 approved, 1 pending");
  console.log("  Payouts:        1 paid batch, 1 pending");
  console.log("  Landing page:   /p/acme-growth/mobile-detailing");
  console.log("  Draft page:     /p/acme-growth/fleet-wash (draft)");
  console.log("\n  --- Brand Ownership ---");
  console.log("  Brands:         SecurX (100%), Paper Flight (60%), Water Ice Express (100%), Legacy (inactive)");
  console.log("  SecurX holders: SecurX Holdings 20%, Lynn Nicely 40%, John Hindy 40%");
  console.log("  Requests:       David Wilson conflict (50%), Sarah Chen pending");
  console.log("  Pages:          /partnerships/brands, /partnerships/brand-partners, /partnerships/ownership-requests, /partnerships/ownership-history");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(disconnect);
