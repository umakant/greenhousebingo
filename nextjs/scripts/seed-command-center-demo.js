/* eslint-disable no-console */
/**
 * Seed realistic Command Center demo data for a single Plant Bingo event so the
 * Event Command Center (Overview + tabs) is fully populated: registrations,
 * check-ins, tickets, transactions, bingo rounds + winners, plant inventory +
 * requests, expenses, revenue, operational checklist, host invitation,
 * affiliate commissions, and recent activity.
 *
 * Prereq: node ./scripts/ensure-event-platform-schema.js && npx prisma generate
 * Usage:  node ./scripts/seed-command-center-demo.js
 *         node ./scripts/seed-command-center-demo.js --event-id=1
 *         node ./scripts/seed-command-center-demo.js --slug=sgh-social-greenhouse-sidelake-brewing
 */

const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

const DEMO_TAG = "[cc-demo]";
const DEMO_DOMAIN = "sidelake-demo.test";
const USER_ID_BASE = 990000n;

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
  "Violet", "Ryan", "Savannah", "Adrian", "Skylar", "Cameron", "Paisley", "Connor", "Bella", "Hunter",
];
const LAST_NAMES = [
  "Anderson", "Brooks", "Carter", "Diaz", "Evans", "Foster", "Garcia", "Hughes", "Ingram", "Jensen",
  "Kelly", "Lopez", "Morgan", "Nguyen", "Ortiz", "Patel", "Quinn", "Reyes", "Sullivan", "Torres",
  "Underwood", "Vega", "Wallace", "Xu", "Young", "Zimmerman", "Bennett", "Coleman", "Dawson", "Ellis",
];

const SOURCES = [
  { registrationSource: "direct", sourceName: "Direct", utmSource: null, utmMedium: null, utmCampaign: null, referralCode: null },
  { registrationSource: "organic_search", sourceName: "Google", utmSource: "google", utmMedium: "organic", utmCampaign: null, referralCode: null },
  { registrationSource: "paid_search", sourceName: "Google Ads", utmSource: "google", utmMedium: "cpc", utmCampaign: "plant-bingo-summer", referralCode: null },
  { registrationSource: "social", sourceName: "Facebook", utmSource: "facebook", utmMedium: "social", utmCampaign: "sidelake-launch", referralCode: null },
  { registrationSource: "social", sourceName: "Instagram", utmSource: "instagram", utmMedium: "social", utmCampaign: "sidelake-launch", referralCode: null },
  { registrationSource: "email", sourceName: "Newsletter", utmSource: "mailchimp", utmMedium: "email", utmCampaign: "july-blast", referralCode: null },
  { registrationSource: "affiliate", sourceName: "Partner Referral", utmSource: "partner", utmMedium: "affiliate", utmCampaign: "greenhouse-partners", referralCode: "LEAF25" },
];

const PLANTS = [
  { name: "Golden Pothos", category: "Foliage", variety: "Epipremnum aureum", qty: 40, unitCost: 3.0, retail: 18.0 },
  { name: "Snake Plant", category: "Foliage", variety: "Sansevieria", qty: 30, unitCost: 4.5, retail: 24.0 },
  { name: "Monstera Deliciosa", category: "Statement", variety: "Swiss Cheese", qty: 18, unitCost: 9.0, retail: 45.0 },
  { name: "Assorted Succulent", category: "Succulent", variety: "Mixed", qty: 70, unitCost: 1.5, retail: 9.0 },
  { name: "Peace Lily", category: "Flowering", variety: "Spathiphyllum", qty: 30, unitCost: 4.0, retail: 22.0 },
  { name: "Boston Fern", category: "Foliage", variety: "Nephrolepis", qty: 30, unitCost: 3.5, retail: 20.0 },
];

const BINGO_ROUNDS = [
  { roundNumber: 1, name: "Traditional Bingo", pattern: "Any line — horizontal, vertical, or diagonal", difficulty: "Easy", prize: "Golden Pothos" },
  { roundNumber: 2, name: "Four Corners", pattern: "Mark all four corner squares", difficulty: "Easy", prize: "Assorted Succulent" },
  { roundNumber: 3, name: "Blackout", pattern: "Cover the entire card", difficulty: "Hard", prize: "Monstera Deliciosa" },
  { roundNumber: 4, name: "Letter X", pattern: "Both diagonals form an X", difficulty: "Medium", prize: "Snake Plant" },
  { roundNumber: 5, name: "Picture Frame", pattern: "Complete the outer border", difficulty: "Medium", prize: "Peace Lily" },
  { roundNumber: 6, name: "Postage Stamp", pattern: "2x2 block in any corner", difficulty: "Easy", prize: "Assorted Succulent" },
  { roundNumber: 7, name: "Double Bingo", pattern: "Two winning lines", difficulty: "Medium", prize: "Boston Fern" },
  { roundNumber: 8, name: "Lucky Leaf Pattern", pattern: "Leaf-shaped pattern on card", difficulty: "Hard", prize: "Peace Lily" },
  { roundNumber: 9, name: "Crazy Garden Pattern", pattern: "Surprise pattern revealed live", difficulty: "Hard", prize: "Monstera Deliciosa" },
  { roundNumber: 10, name: "Wild Card Finale", pattern: "Winner picks any plant on the floor", difficulty: "Epic", prize: "Winner's Choice" },
];

const CHECKLIST = [
  { templateKey: "venue_confirmed", title: "Venue confirmed", category: "Venue", done: true },
  { templateKey: "venue_contract_received", title: "Venue contract received", category: "Venue", done: true },
  { templateKey: "venue_fee_scheduled", title: "Venue fee scheduled", category: "Venue", done: true },
  { templateKey: "host_invited", title: "Host invited", category: "Host", done: true },
  { templateKey: "host_confirmed", title: "Host confirmed", category: "Host", done: true },
  { templateKey: "host_arrival_confirmed", title: "Host arrival time confirmed", category: "Host", done: true },
  { templateKey: "ticket_tiers_active", title: "Ticket tiers active", category: "Tickets", done: true },
  { templateKey: "qr_checkin_tested", title: "QR check-in tested", category: "Check-In", done: true },
  { templateKey: "bingo_cards_ready", title: "Bingo cards ready", category: "Games", done: true },
  { templateKey: "plant_inventory_assigned", title: "Plant inventory assigned", category: "Plants", done: true },
  { templateKey: "all_games_configured", title: "All games configured", category: "Games", done: true },
  { templateKey: "all_prizes_assigned", title: "All prizes assigned", category: "Games", done: true },
  { templateKey: "final_round_prize_assigned", title: "Final-round prize assigned", category: "Games", done: true },
  { templateKey: "sponsor_deliverables_reviewed", title: "Sponsor deliverables reviewed", category: "Sponsors", done: true },
  { templateKey: "promotions_active", title: "Promotions active", category: "Marketing", done: true },
  { templateKey: "affiliate_links_tested", title: "Affiliate links tested", category: "Marketing", done: true },
  { templateKey: "staff_assignments_confirmed", title: "Staff assignments confirmed", category: "Staff", done: true },
  { templateKey: "event_announcement_scheduled", title: "Event announcement scheduled", category: "Marketing", done: true },
  { templateKey: "host_payment_completed", title: "Host payment completed", category: "Financial", done: false },
  { templateKey: "venue_payment_completed", title: "Venue payment completed", category: "Financial", done: true },
  { templateKey: "post_event_report_generated", title: "Post-event report generated", category: "Post-Event", done: false },
];

async function resolveEvent() {
  const idArg = readArg("--event-id");
  const slugArg = readArg("--slug");
  if (idArg) {
    return prisma.lmsTrainingEvent.findFirst({ where: { id: BigInt(idArg) } });
  }
  if (slugArg) {
    return prisma.lmsTrainingEvent.findFirst({ where: { slug: slugArg } });
  }
  return (
    (await prisma.lmsTrainingEvent.findFirst({ where: { title: { contains: "Sidelake" } } })) ||
    (await prisma.lmsTrainingEvent.findFirst({ where: { id: 1n } }))
  );
}

async function cleanup(orgId, eventId) {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
    select: { id: true },
  });
  const demoUserIds = demoUsers.map((u) => u.id);

  // Registrations cascade to transactions, winners, and plant requests.
  if (demoUserIds.length) {
    await prisma.lmsEventRegistration.deleteMany({
      where: { eventId, studentUserId: { in: demoUserIds } },
    });
  }
  await prisma.eventBingoWinner.deleteMany({ where: { organizationId: orgId, eventId } });
  await prisma.eventPlantAssignment.deleteMany({ where: { organizationId: orgId, eventId } });
  await prisma.eventBingoRoundInstance.deleteMany({ where: { organizationId: orgId, eventId } });
  await prisma.eventPlantRequest.deleteMany({ where: { organizationId: orgId, eventId } });
  await prisma.eventPlant.deleteMany({ where: { organizationId: orgId, eventId, notes: DEMO_TAG } });
  await prisma.eventExpense.deleteMany({ where: { organizationId: orgId, eventId, notes: DEMO_TAG } });
  await prisma.eventRevenueEntry.deleteMany({ where: { organizationId: orgId, eventId, notes: DEMO_TAG } });
  await prisma.eventOperationalTask.deleteMany({ where: { organizationId: orgId, eventId } });
  await prisma.eventHostInvitation.deleteMany({ where: { organizationId: orgId, eventId, message: DEMO_TAG } });
  await prisma.eventAuditLog.deleteMany({
    where: { organizationId: orgId, entityId: eventId.toString(), action: { startsWith: "demo." } },
  });

  const demoVendor = await prisma.eventVendor.findFirst({
    where: { organizationId: orgId, email: `demo-vendor@${DEMO_DOMAIN}` },
  });
  if (demoVendor) {
    await prisma.eventCommissionLedger.deleteMany({
      where: { organizationId: orgId, eventId, vendorId: demoVendor.id },
    });
  }
}

async function ensureTickets(orgId, eventId) {
  const tickets = await prisma.lmsEventTicket.findMany({ where: { organizationId: orgId, eventId } });
  let general = tickets.find((t) => !isBonusTicket(t));
  let bonus = tickets.find((t) => isBonusTicket(t));

  if (!general) {
    general = await prisma.lmsEventTicket.create({
      data: {
        organizationId: orgId,
        eventId,
        name: "General admission",
        description: "Includes bingo cards and one guaranteed take-home plant.",
        price: 30,
        currency: "USD",
        ticketStatus: "available",
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }
  if (!bonus) {
    bonus = await prisma.lmsEventTicket.create({
      data: {
        organizationId: orgId,
        eventId,
        name: EXTRA_BINGO_CARD_TICKET_NAME,
        description: BONUS_CARD_TICKET_DESCRIPTION,
        price: 5,
        currency: "USD",
        ticketStatus: "available",
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }
  return { general, bonus };
}

async function main() {
  const event = await resolveEvent();
  if (!event) {
    console.error("[cc-demo] Could not resolve target event. Pass --event-id or --slug.");
    process.exit(1);
  }
  const orgId = event.organizationId;
  const eventId = event.id;
  console.log(`[cc-demo] Event #${eventId} "${event.title}" (org ${orgId})`);

  await cleanup(orgId, eventId);

  // 1) Rich detail content: games, host, sponsor, venue/host ops, includes, FAQs.
  const host = {
    name: "Jordan Reyes",
    bio: "Plant Bingo host and community events lead. Jordan has emceed 40+ Social Greenhouse nights.",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&fit=crop",
    catalogHostId: undefined,
  };
  const sponsor = {
    name: "Sidelake Garden Supply",
    address: "1401 Marshall St NE, Minneapolis, MN 55413",
    phone: "(612) 555-0182",
    perk: "10% off any potting mix with your event wristband.",
    package: "Gold",
    contribution: 500,
    paymentStatus: "paid",
    deliverables: ["Logo on cards", "Table at entrance", "Social shoutout"],
    completedDeliverables: ["Logo on cards", "Table at entrance", "Social shoutout"],
  };
  const detailContent = {
    ...(event.detailContent && typeof event.detailContent === "object" ? event.detailContent : {}),
    regionTag: "MN",
    heroTagline: "Everyone Leaves With a Plant. 🌿 Guaranteed.",
    descriptionTitle: "You're Invited to Plant Bingo at Sidelake Brewing!",
    bingoEnd: "9:00 PM",
    venuePhone: "(612) 555-0147",
    agePolicyText: "21+ only. Valid ID required at the door.",
    cardFeePercent: 3.5,
    soldOut: false,
    venueAmenities: { age21Plus: true, drinksAlcohol: true, food: true },
    venueHostOps: {
      venueFee: 600,
      contractStatus: "signed",
      venuePaymentStatus: "paid",
      scheduledHostArrival: "5:00 PM",
      hostPaymentType: "flat",
      hostPaymentAmount: 300,
      hostPaymentStatus: "paid",
      parking: "Free street parking + lot behind the taproom.",
      accessibility: "Ground-floor, wheelchair accessible.",
    },
    host,
    hosts: [host],
    sponsor,
    sponsors: [sponsor],
    whatsIncluded: [
      "2 Bingo cards included with ticket",
      "Complimentary adult beverages",
      "10 rounds of Plant Bingo",
      "One guaranteed take-home plant",
      "Light refreshments",
      "Sponsor discount card",
    ],
    checkInSteps: [
      "Buy online — we'll generate a QR code for each ticket.",
      "Check your email — your QR codes arrive instantly.",
      "Scan at the door — our host scans your QR code and hands you your cards.",
      "Pick up plants at the end — one plant per ticket purchased.",
    ],
    bingoRounds: BINGO_ROUNDS,
    faqs: [
      { question: "How do I get in?", answer: "Show the QR code from your confirmation email at the door." },
      { question: "How many plants do I take home?", answer: "One plant per ticket purchased." },
      { question: "Can I buy tickets at the door?", answer: "Online only so we can guarantee a plant for every guest." },
    ],
    bonusCardsAllowed: true,
  };

  await prisma.lmsTrainingEvent.update({
    where: { id: eventId },
    data: { detailContent, isPublic: true, isFeatured: true, updatedAt: new Date() },
  });

  // 2) Tickets
  const { general, bonus } = await ensureTickets(orgId, eventId);

  // 3) Attendee users + 4) registrations + 5) transactions
  const specs = [];
  for (let i = 0; i < 80; i++) specs.push({ kind: "general_paid" });
  for (let i = 0; i < 6; i++) specs.push({ kind: "general_unpaid" });
  for (let i = 0; i < 12; i++) specs.push({ kind: "bonus_paid" });
  for (let i = 0; i < 4; i++) specs.push({ kind: "cancelled" });
  for (let i = 0; i < 3; i++) specs.push({ kind: "waitlisted" });

  const createdRegs = [];
  let checkedInCount = 0;
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const userId = USER_ID_BASE + BigInt(i + 1);
    const first = pick(FIRST_NAMES, i);
    const last = pick(LAST_NAMES, i * 7 + 3);
    const name = `${first} ${last}`;
    const email = `attendee-${i + 1}@${DEMO_DOMAIN}`;

    await prisma.user.upsert({
      where: { id: userId },
      update: { name, email, isActive: true },
      create: {
        id: userId,
        name,
        email,
        type: "client",
        isActive: true,
        isEnableLogin: false,
        createdBy: Number(orgId),
      },
    });

    const src = pick(SOURCES, i * 3);
    const regAt = daysAgo(30 - Math.floor((i / specs.length) * 29), 9 + (i % 10), (i * 7) % 60);

    let ticketId = general.id;
    let amountPaid = 30;
    let bookingStatus = "confirmed";
    let paymentStatus = "paid";
    let checkedInAt = null;

    if (spec.kind === "general_unpaid") {
      bookingStatus = "pending";
      paymentStatus = "unpaid";
      amountPaid = 0;
    } else if (spec.kind === "bonus_paid") {
      ticketId = bonus.id;
      amountPaid = 5;
    } else if (spec.kind === "cancelled") {
      bookingStatus = "cancelled";
      paymentStatus = "refunded";
      amountPaid = 0;
    } else if (spec.kind === "waitlisted") {
      bookingStatus = "waitlisted";
      paymentStatus = "unpaid";
      amountPaid = 0;
    }

    // A subset of paid confirmed attendees checked in (early arrivals).
    if ((spec.kind === "general_paid" || spec.kind === "bonus_paid") && checkedInCount < 24 && i % 4 === 0) {
      checkedInAt = daysAgo(0, 18, (i * 3) % 60);
      bookingStatus = "checked_in";
      checkedInCount++;
    }

    const reg = await prisma.lmsEventRegistration.create({
      data: {
        organizationId: orgId,
        eventId,
        ticketId,
        studentUserId: userId,
        bookingStatus,
        attendeeName: name,
        attendeeEmail: email,
        paymentStatus,
        amountPaid,
        currency: "USD",
        registeredAt: regAt,
        checkedInAt,
        qrToken: `QR-CC-${eventId}-${i + 1}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        registrationSource: src.registrationSource,
        sourceName: src.sourceName,
        utmSource: src.utmSource,
        utmMedium: src.utmMedium,
        utmCampaign: src.utmCampaign,
        referralCode: src.referralCode,
        firstTouchAt: regAt,
        lastTouchAt: regAt,
        createdById: orgId,
        updatedById: orgId,
      },
    });
    createdRegs.push({ id: reg.id, kind: spec.kind, amountPaid, name, regAt, checkedIn: Boolean(checkedInAt) });

    if (amountPaid > 0 && paymentStatus === "paid") {
      await prisma.lmsEventTransaction.create({
        data: {
          organizationId: orgId,
          eventId,
          registrationId: reg.id,
          attendeeName: name,
          amount: amountPaid,
          currency: "USD",
          method: pick(["card", "card", "card", "cash"], i),
          status: "completed",
          processedAt: regAt,
          createdById: orgId,
          updatedById: orgId,
        },
      });
    }
  }

  // 6) Bingo round instances (first few completed, rest scheduled)
  const roundInstances = [];
  for (const r of BINGO_ROUNDS) {
    const plant = PLANTS.find((p) => p.name === r.prize);
    const status = r.roundNumber <= 3 ? "completed" : r.roundNumber === 4 ? "in_progress" : "scheduled";
    const inst = await prisma.eventBingoRoundInstance.create({
      data: {
        organizationId: orgId,
        eventId,
        roundNumber: r.roundNumber,
        name: r.name,
        pattern: r.pattern,
        difficulty: r.difficulty,
        assignedPrize: r.prize,
        prizeCost: plant ? plant.unitCost : 5,
        prizeRetailValue: plant ? plant.retail : 25,
        status,
        actualStartAt: status !== "scheduled" ? daysAgo(0, 19, r.roundNumber * 5) : null,
        actualEndAt: status === "completed" ? daysAgo(0, 19, r.roundNumber * 5 + 4) : null,
        createdById: orgId,
        updatedById: orgId,
      },
    });
    roundInstances.push(inst);
  }

  // 7) Winners for completed rounds (tie to checked-in attendees)
  const checkedRegs = createdRegs.filter((r) => r.checkedIn);
  const completedRounds = roundInstances.filter((r) => r.status === "completed");
  let winnerCount = 0;
  for (let i = 0; i < completedRounds.length && i < checkedRegs.length; i++) {
    const round = completedRounds[i];
    const reg = checkedRegs[i];
    await prisma.eventBingoWinner.create({
      data: {
        organizationId: orgId,
        eventId,
        roundInstanceId: round.id,
        registrationId: reg.id,
        winningCardNumber: `C-${1000 + i}`,
        cardType: "included",
        prizeLabel: round.assignedPrize,
        prizeCost: round.prizeCost,
        prizeRetailValue: round.prizeRetailValue,
        verified: true,
        verifiedById: orgId,
        verifiedAt: daysAgo(0, 20, i * 3),
        createdById: orgId,
        updatedById: orgId,
      },
    });
    winnerCount++;
  }

  // 8) Plant inventory
  const plantRows = [];
  for (const p of PLANTS) {
    const row = await prisma.eventPlant.create({
      data: {
        organizationId: orgId,
        eventId,
        name: p.name,
        category: p.category,
        variety: p.variety,
        quantityPurchased: p.qty,
        quantityAssigned: Math.round(p.qty * 0.3),
        quantityAwarded: winnerCount > 0 ? Math.min(3, p.qty) : 0,
        unitCost: p.unitCost,
        retailValue: p.retail,
        status: "available",
        notes: DEMO_TAG,
        createdById: orgId,
        updatedById: orgId,
      },
    });
    plantRows.push(row);
  }

  // 9) Plant requests (attendee preferences)
  const requestTargets = createdRegs.filter((r) => r.kind === "general_paid" || r.kind === "bonus_paid").slice(0, 22);
  for (let i = 0; i < requestTargets.length; i++) {
    const plant = pick(plantRows, i);
    await prisma.eventPlantRequest.create({
      data: {
        organizationId: orgId,
        eventId,
        registrationId: requestTargets[i].id,
        eventPlantId: plant.id,
        requestedPlantName: plant.name,
        priority: (i % 3) + 1,
      },
    });
  }

  // 10) Plant assignments to rounds
  for (let i = 0; i < roundInstances.length; i++) {
    const plant = plantRows.find((p) => p.name === roundInstances[i].assignedPrize) || pick(plantRows, i);
    await prisma.eventPlantAssignment.create({
      data: {
        organizationId: orgId,
        eventId,
        eventPlantId: plant.id,
        roundInstanceId: roundInstances[i].id,
        quantity: 1,
        status: "assigned",
        assignedById: orgId,
      },
    });
  }

  // 11) Expenses (venue/host/promotions/other/affiliates — NOT plants; plant cost is derived from inventory)
  const expenses = [
    { category: "venue", payeeName: "Sidelake Brewing", description: "Venue rental fee", total: 600, paymentStatus: "paid" },
    { category: "host", payeeName: "Jordan Reyes", description: "Host fee (flat)", total: 300, paymentStatus: "paid" },
    { category: "promotions", payeeName: "Meta Ads", description: "Facebook & Instagram promotion", total: 150, paymentStatus: "paid" },
    { category: "affiliates", payeeName: "Greenhouse Partners", description: "Affiliate referral payouts", total: 90, paymentStatus: "pending" },
    { category: "other", payeeName: "Print Shop", description: "Bingo cards & signage", total: 80, paymentStatus: "paid" },
  ];
  for (const e of expenses) {
    await prisma.eventExpense.create({
      data: {
        organizationId: orgId,
        eventId,
        category: e.category,
        payeeName: e.payeeName,
        description: e.description,
        quantity: 1,
        unitCost: e.total,
        subtotal: e.total,
        tax: 0,
        total: e.total,
        currency: "USD",
        paymentStatus: e.paymentStatus,
        paidAt: e.paymentStatus === "paid" ? daysAgo(5) : null,
        notes: DEMO_TAG,
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }

  // 12) Supplemental revenue entries (sponsor + bar share)
  const revenues = [
    { category: "sponsor", payeeName: "Sidelake Garden Supply", description: "Gold sponsorship", amount: 500 },
    { category: "other", payeeName: "Sidelake Brewing", description: "Bar sales revenue share", amount: 240 },
  ];
  for (const r of revenues) {
    await prisma.eventRevenueEntry.create({
      data: {
        organizationId: orgId,
        eventId,
        category: r.category,
        payeeName: r.payeeName,
        description: r.description,
        amount: r.amount,
        currency: "USD",
        paymentStatus: "paid",
        receivedAt: daysAgo(7),
        notes: DEMO_TAG,
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }

  // 13) Operational checklist (≥80% complete → green health factor)
  for (const t of CHECKLIST) {
    await prisma.eventOperationalTask.create({
      data: {
        organizationId: orgId,
        eventId,
        templateKey: t.templateKey,
        title: t.title,
        category: t.category,
        status: t.done ? "completed" : "pending",
        completedAt: t.done ? daysAgo(3) : null,
        completedById: t.done ? orgId : null,
        dueAt: daysAgo(1),
        createdById: orgId,
      },
    });
  }

  // 14) Host catalog record + accepted invitation
  let catalogHost = await prisma.eventHost.findFirst({
    where: { organizationId: orgId, email: `jordan.reyes@${DEMO_DOMAIN}` },
  });
  if (!catalogHost) {
    catalogHost = await prisma.eventHost.create({
      data: {
        organizationId: orgId,
        displayName: host.name,
        firstName: "Jordan",
        lastName: "Reyes",
        email: `jordan.reyes@${DEMO_DOMAIN}`,
        phone: "(612) 555-0199",
        bio: host.bio,
        imageUrl: host.imageUrl,
        status: "active",
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }
  await prisma.eventHostInvitation.create({
    data: {
      organizationId: orgId,
      hostId: catalogHost.id,
      eventId,
      inviteToken: `CC-DEMO-${eventId}-${Date.now().toString(36).toUpperCase()}`,
      status: "accepted",
      message: DEMO_TAG,
      invitedById: orgId,
      respondedAt: daysAgo(9),
    },
  });

  // 15) Affiliate commission ledger (pending) — drives commissions alert + financials
  let demoVendor = await prisma.eventVendor.findFirst({
    where: { organizationId: orgId, email: `demo-vendor@${DEMO_DOMAIN}` },
  });
  if (!demoVendor) {
    demoVendor = await prisma.eventVendor.create({
      data: {
        organizationId: orgId,
        vendorName: "Greenhouse Partners",
        companyName: "Greenhouse Partners LLC",
        contactName: "Morgan Lee",
        email: `demo-vendor@${DEMO_DOMAIN}`,
        status: "active",
        defaultCommissionRate: 12,
        payoutMethod: "ach",
        notes: DEMO_TAG,
        createdById: orgId,
        updatedById: orgId,
        updatedAt: new Date(),
      },
    });
  }
  for (const gross of [149, 90]) {
    const platformCommission = new Prisma.Decimal(gross).mul(12).div(100);
    const vendorNet = new Prisma.Decimal(gross).sub(platformCommission);
    await prisma.eventCommissionLedger.create({
      data: {
        organizationId: orgId,
        vendorId: demoVendor.id,
        eventId,
        grossAmount: gross,
        platformCommission,
        vendorNet,
        currency: "USD",
        status: "pending",
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }

  // 16) Recent activity audit logs
  const auditEntries = [
    { entityType: "registration", action: "demo.registration.created" },
    { entityType: "registration", action: "demo.checkin.recorded" },
    { entityType: "bingo_round", action: "demo.round.completed" },
    { entityType: "plant", action: "demo.plant.inventory_added" },
    { entityType: "expense", action: "demo.expense.recorded" },
    { entityType: "host", action: "demo.host.invitation_accepted" },
    { entityType: "event", action: "demo.games.configured" },
    { entityType: "event", action: "demo.event.published" },
  ];
  for (let i = 0; i < auditEntries.length; i++) {
    await prisma.eventAuditLog.create({
      data: {
        organizationId: orgId,
        eventId,
        actorUserId: orgId,
        action: auditEntries[i].action,
        entityType: auditEntries[i].entityType,
        entityId: eventId.toString(),
        metadataJson: { demo: true },
        createdAt: daysAgo(i, 14, i * 5),
      },
    });
  }

  // Keep event denormalized totals roughly in sync.
  const grossTickets = createdRegs
    .filter((r) => r.amountPaid > 0)
    .reduce((s, r) => s + r.amountPaid, 0);
  await prisma.lmsTrainingEvent.update({
    where: { id: eventId },
    data: {
      registeredCount: createdRegs.filter((r) => r.kind !== "cancelled").length,
      revenueTotal: grossTickets,
      updatedAt: new Date(),
    },
  });

  const validRegs = createdRegs.filter((r) => r.kind !== "cancelled");
  console.log("[cc-demo] Done.");
  console.log(`  Registrations: ${createdRegs.length} (${validRegs.length} valid, ${checkedInCount} checked in)`);
  console.log(`  Ticket revenue: $${grossTickets.toFixed(2)}`);
  console.log(`  Bingo rounds: ${roundInstances.length} (${completedRounds.length} completed), winners: ${winnerCount}`);
  console.log(`  Plants: ${plantRows.length} types, requests: ${requestTargets.length}`);
  console.log(`  Expenses: ${expenses.length}, revenue entries: ${revenues.length}`);
  console.log(`  Checklist tasks: ${CHECKLIST.length} (${CHECKLIST.filter((t) => t.done).length} complete)`);
  console.log("  Host invitation accepted, 2 pending commissions, 8 activity log entries");
}

main()
  .catch((err) => {
    console.error("[cc-demo] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
