/* eslint-disable no-console */
/**
 * Seed LMS training events demo data (mirrors src/lib/lms-events/mock-data.ts).
 *
 * Run after: npm run db:ensure:lms-events && npx prisma generate
 * Run: npm run db:seed:lms-events
 *
 * Env: LMS_SEED_ORG_ID (default 1000), LMS_SEED_STUDENT_ID (default 1001)
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const SLUG_PREFIX = "pf-demo-lms-ev-";

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");
const FILTER_STUDENT_EMAIL = readArg("--student-email");

function parseBigint(v, fallback) {
  try {
    return BigInt(String(v).trim());
  } catch {
    return fallback;
  }
}

function daysFromNow(n, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** Demo card images (Unsplash — no local upload required). */
const DEMO_IMAGES = {
  cpr: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
  drug: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
  security: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
  acls: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80",
  it: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80",
  hipaa: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
  medical: "https://images.unsplash.com/photo-1519494029327-3184c1a1b9f7?w=800&q=80",
};

function evSlug(s) {
  return `${SLUG_PREFIX}${s}`;
}

async function assertSchema() {
  try {
    await prisma.$queryRaw`SELECT 1 FROM lms_events LIMIT 1`;
  } catch (e) {
    console.error("[seed-lms-events] Tables missing. Run: npm run db:ensure:lms-events && npx prisma generate");
    process.exit(1);
  }
}

async function upsertCategory(orgId, { slug, name, description, sortOrder }) {
  const existing = await prisma.lmsEventCategory.findFirst({
    where: { organizationId: orgId, slug: evSlug(slug) },
  });
  if (existing) {
    return prisma.lmsEventCategory.update({
      where: { id: existing.id },
      data: { name, description, status: "published", sortOrder, updatedAt: new Date() },
    });
  }
  return prisma.lmsEventCategory.create({
    data: {
      organizationId: orgId,
      slug: evSlug(slug),
      name,
      description,
      status: "published",
      sortOrder,
      createdById: orgId,
      updatedById: orgId,
    },
  });
}

async function upsertEvent(orgId, categoryId, data) {
  const existing = await prisma.lmsTrainingEvent.findFirst({
    where: { organizationId: orgId, slug: evSlug(data.slug) },
  });
  const payload = {
    organizationId: orgId,
    slug: evSlug(data.slug),
    title: data.title,
    description: data.description,
    shortDescription: data.shortDescription,
    imageUrl: data.imageUrl,
    categoryId,
    eventType: data.eventType,
    deliveryMode: data.deliveryMode,
    status: data.status,
    instructorName: data.instructorName,
    instructorUserId: data.instructorUserId,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    timezone: "America/New_York",
    venueName: data.venueName,
    venueAddress: data.venueAddress,
    venueCity: data.venueCity,
    venueState: data.venueState,
    venuePostalCode: data.venuePostalCode,
    venueCountry: data.venueCountry,
    venueLat: data.venueLat,
    venueLng: data.venueLng,
    onlineMeetingUrl: data.onlineMeetingUrl,
    capacity: data.capacity,
    registeredCount: data.registeredCount,
    isPublic: data.isPublic,
    isFree: data.isFree,
    priceFrom: data.priceFrom,
    currency: "USD",
    certificationAvailable: data.certificationAvailable,
    certificationName: data.certificationName,
    requirements: data.requirements,
    cancellationPolicy: data.cancellationPolicy,
    revenueTotal: data.revenueTotal,
    createdById: orgId,
    updatedById: orgId,
    updatedAt: new Date(),
  };
  if (existing) {
    return prisma.lmsTrainingEvent.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.lmsTrainingEvent.create({ data: payload });
}

async function upsertTicket(orgId, eventId, data) {
  const existing = await prisma.lmsEventTicket.findFirst({
    where: { organizationId: orgId, eventId, name: data.name },
  });
  const payload = {
    organizationId: orgId,
    eventId,
    name: data.name,
    description: data.description,
    price: data.price,
    currency: "USD",
    quantity: data.quantity,
    soldCount: data.soldCount,
    saleStartsAt: data.saleStartsAt,
    saleEndsAt: data.saleEndsAt,
    ticketStatus: "available",
    isFree: data.isFree,
    createdById: orgId,
    updatedById: orgId,
    updatedAt: new Date(),
  };
  if (existing) {
    return prisma.lmsEventTicket.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.lmsEventTicket.create({ data: payload });
}

async function upsertRegistration(orgId, studentId, eventId, ticketId, data) {
  const existing = await prisma.lmsEventRegistration.findFirst({
    where: { eventId, studentUserId: studentId },
  });
  const payload = {
    organizationId: orgId,
    eventId,
    ticketId,
    studentUserId: studentId,
    bookingStatus: data.bookingStatus,
    attendeeName: data.attendeeName,
    attendeeEmail: data.attendeeEmail,
    paymentStatus: data.paymentStatus,
    amountPaid: data.amountPaid,
    currency: "USD",
    registeredAt: data.registeredAt,
    checkedInAt: data.checkedInAt,
    qrToken: data.qrToken,
    createdById: studentId,
    updatedById: studentId,
    updatedAt: new Date(),
  };
  if (existing) {
    return prisma.lmsEventRegistration.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.lmsEventRegistration.create({ data: payload });
}

async function findCompany() {
  if (!FILTER_EMAIL && !FILTER_NAME) {
    const orgId = parseBigint(process.env.LMS_SEED_ORG_ID, 1000n);
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

async function findStudentUser(companyId) {
  if (FILTER_STUDENT_EMAIL) {
    const u = await prisma.user.findFirst({
      where: {
        email: { equals: FILTER_STUDENT_EMAIL, mode: "insensitive" },
        createdBy: companyId,
      },
      select: { id: true, email: true, name: true },
    });
    if (u) return u;
  }
  const envStudentId = process.env.LMS_SEED_STUDENT_ID?.trim();
  if (envStudentId) {
    const u = await prisma.user.findFirst({
      where: { id: BigInt(envStudentId), createdBy: companyId },
      select: { id: true, email: true, name: true },
    });
    if (u) return u;
  }
  return prisma.user.findFirst({
    where: { type: "staff", createdBy: companyId, isActive: true },
    orderBy: { id: "asc" },
    select: { id: true, email: true, name: true },
  });
}

async function findInstructorUser(companyId) {
  const envId = process.env.LMS_SEED_INSTRUCTOR_ID?.trim();
  if (envId) {
    const u = await prisma.user.findFirst({
      where: { id: BigInt(envId), createdBy: companyId },
      select: { id: true },
    });
    if (u) return u.id;
  }
  const instructor = await prisma.user.findFirst({
    where: { type: { in: ["staff", "lms-instructor"] }, createdBy: companyId, isActive: true },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  return instructor?.id ?? companyId;
}

async function main() {
  await assertSchema();

  const company = await findCompany();
  if (!company) {
    console.error(
      '[seed-lms-events] No company found. Use --name="First Aid Responders", --email=crimson@mailsac.com, or LMS_SEED_ORG_ID.',
    );
    process.exit(1);
  }

  const orgId = company.id;
  const student = await findStudentUser(orgId);
  if (!student) {
    console.error(`[seed-lms-events] No staff user for org ${orgId.toString()}.`);
    process.exit(1);
  }
  const studentId = student.id;
  const instructorId = await findInstructorUser(orgId);

  console.log(
    `[seed-lms-events] Org ${orgId.toString()} (${company.name ?? company.email}), student ${studentId.toString()} (${student.email})`,
  );

  const catCert = await upsertCategory(orgId, {
    slug: "certification",
    name: "Certification",
    description: "Certification and recertification classes",
    sortOrder: 1,
  });
  const catMedical = await upsertCategory(orgId, {
    slug: "medical-training",
    name: "Medical training",
    description: "CPR, first aid, and clinical refreshers",
    sortOrder: 2,
  });
  const catCompliance = await upsertCategory(orgId, {
    slug: "compliance",
    name: "Compliance",
    description: "Background checks and regulatory workshops",
    sortOrder: 3,
  });
  const catSafety = await upsertCategory(orgId, {
    slug: "safety",
    name: "Safety",
    description: "Workplace and field safety training",
    sortOrder: 4,
  });
  const catSecurity = await upsertCategory(orgId, {
    slug: "security",
    name: "Security",
    description: "Event and operations security",
    sortOrder: 5,
  });
  const catItSecurity = await upsertCategory(orgId, {
    slug: "it-security",
    name: "IT Security",
    description: "Cybersecurity and data protection",
    sortOrder: 6,
  });

  const evtCpr = await upsertEvent(orgId, catMedical.id, {
    slug: "cpr-first-aid-certification",
    title: "CPR & First Aid Certification",
    description:
      "Comprehensive CPR and first aid certification for field responders. Includes hands-on skills practice and scenario drills.",
    shortDescription: "Hands-on CPR and first aid certification for active responders.",
    imageUrl: DEMO_IMAGES.cpr,
    eventType: "cpr_class",
    deliveryMode: "in_person",
    status: "registration_open",
    instructorName: "John Davis",
    instructorUserId: instructorId,
    startsAt: daysFromNow(18, 9),
    endsAt: daysFromNow(18, 13),
    venueName: "Allegiant Stadium",
    venueAddress: "3333 Al Davis Way",
    venueCity: "Las Vegas",
    venueState: "NV",
    venuePostalCode: "89118",
    venueCountry: "US",
    venueLat: 36.0909,
    venueLng: -115.1833,
    onlineMeetingUrl: null,
    capacity: 30,
    registeredCount: 20,
    isPublic: true,
    isFree: false,
    priceFrom: 149,
    certificationAvailable: true,
    certificationName: "CPR & First Aid",
    requirements: "Closed-toe shoes required. Arrive 15 minutes early.",
    cancellationPolicy: "Full refund up to 7 days before the event.",
    revenueTotal: 2980,
  });

  const evtBg = await upsertEvent(orgId, catCompliance.id, {
    slug: "background-check-compliance-workshop",
    title: "Background Check Compliance Workshop",
    description:
      "Learn how to turn screening workflows into revenue while staying compliant with FCRA and state rules.",
    shortDescription: "Compliance workshop for screening resellers.",
    imageUrl: null,
    eventType: "background_check_workshop",
    deliveryMode: "online",
    status: "registration_open",
    instructorName: "Jordan Lee",
    instructorUserId: instructorId,
    startsAt: daysFromNow(21, 13),
    endsAt: daysFromNow(21, 16),
    venueName: null,
    venueAddress: null,
    venueCity: null,
    venueState: null,
    venuePostalCode: null,
    venueCountry: null,
    venueLat: null,
    venueLng: null,
    onlineMeetingUrl: "https://meet.example.com/bg-workshop",
    capacity: 100,
    registeredCount: 0,
    isPublic: true,
    isFree: true,
    priceFrom: 0,
    certificationAvailable: false,
    certificationName: null,
    requirements: "Laptop with stable internet connection.",
    cancellationPolicy: "Cancel anytime before start.",
    revenueTotal: 0,
  });

  const evtMed = await upsertEvent(orgId, catCert.id, {
    slug: "event-medical-team-lead",
    title: "Event Medical Team Lead Intensive",
    description: "Leadership training for medics managing onsite coverage at large public events.",
    shortDescription: "Leadership intensive for event medical leads.",
    imageUrl: DEMO_IMAGES.medical,
    eventType: "certification_class",
    deliveryMode: "hybrid",
    status: "published",
    instructorName: "Capt. Sam Ortiz",
    instructorUserId: null,
    startsAt: daysFromNow(45, 8),
    endsAt: daysFromNow(47, 17),
    venueName: "Civic Center Annex",
    venueAddress: "400 Convention Blvd",
    venueCity: "Camden",
    venueState: "NJ",
    venuePostalCode: "08103",
    venueCountry: "US",
    venueLat: 39.9259,
    venueLng: -75.1196,
    onlineMeetingUrl: "https://meet.example.com/med-lead-day2",
    capacity: 40,
    registeredCount: 0,
    isPublic: true,
    isFree: false,
    priceFrom: 249,
    certificationAvailable: true,
    certificationName: "Event Medical Team Lead",
    requirements: "Minimum 2 years field experience. Pre-read materials will be emailed.",
    cancellationPolicy: "50% refund within 14 days of event.",
    revenueTotal: 2988,
  });

  const evtDrug = await upsertEvent(orgId, catCompliance.id, {
    slug: "drug-screening-compliance",
    title: "Drug Screening & Compliance Training",
    description: "Learn compliant drug screening workflows for staffing and event medical teams.",
    shortDescription: "Drug screening compliance for field operations.",
    imageUrl: DEMO_IMAGES.drug,
    eventType: "live_workshop",
    deliveryMode: "online",
    status: "registration_open",
    instructorName: "Mike Smith",
    instructorUserId: instructorId,
    startsAt: daysFromNow(22, 10),
    endsAt: daysFromNow(22, 12),
    venueName: null,
    venueAddress: null,
    venueCity: null,
    venueState: null,
    venuePostalCode: null,
    venueCountry: null,
    venueLat: null,
    venueLng: null,
    onlineMeetingUrl: "https://meet.example.com/drug-screening",
    capacity: 80,
    registeredCount: 45,
    isPublic: true,
    isFree: false,
    priceFrom: 79,
    certificationAvailable: false,
    certificationName: null,
    requirements: "Laptop with stable internet.",
    cancellationPolicy: "Cancel up to 24 hours before start.",
    revenueTotal: 3555,
  });

  const evtSecOps = await upsertEvent(orgId, catSecurity.id, {
    slug: "event-security-operations",
    title: "Event Security Operations Workshop",
    description: "Crowd management, access control, and incident response for large venue events.",
    shortDescription: "Security operations for venue and festival medics.",
    imageUrl: DEMO_IMAGES.security,
    eventType: "security_training",
    deliveryMode: "in_person",
    status: "registration_open",
    instructorName: "Sarah Johnson",
    instructorUserId: instructorId,
    startsAt: daysFromNow(28, 8),
    endsAt: daysFromNow(28, 17),
    venueName: "Convention Center Hall B",
    venueAddress: "100 Convention Ave",
    venueCity: "Atlantic City",
    venueState: "NJ",
    venuePostalCode: "08401",
    venueCountry: "US",
    venueLat: 39.3643,
    venueLng: -74.4229,
    onlineMeetingUrl: null,
    capacity: 25,
    registeredCount: 18,
    isPublic: true,
    isFree: false,
    priceFrom: 199,
    certificationAvailable: true,
    certificationName: "Event Security Ops",
    requirements: "Prior security or medic experience recommended.",
    cancellationPolicy: "50% refund within 14 days of event.",
    revenueTotal: 3582,
  });

  const evtAcls = await upsertEvent(orgId, catMedical.id, {
    slug: "advanced-cardiac-life-support",
    title: "Advanced Cardiac Life Support (ACLS)",
    description: "ACLS provider course with megacode simulations and team-based resuscitation drills.",
    shortDescription: "ACLS certification for advanced providers.",
    imageUrl: DEMO_IMAGES.acls,
    eventType: "certification_class",
    deliveryMode: "in_person",
    status: "registration_open",
    instructorName: "Emily Brown",
    instructorUserId: instructorId,
    startsAt: daysFromNow(35, 8),
    endsAt: daysFromNow(35, 16),
    venueName: "Regional Medical Simulation Lab",
    venueAddress: "500 Health Park Dr",
    venueCity: "Philadelphia",
    venueState: "PA",
    venuePostalCode: "19104",
    venueCountry: "US",
    venueLat: 39.9526,
    venueLng: -75.1652,
    onlineMeetingUrl: null,
    capacity: 20,
    registeredCount: 12,
    isPublic: true,
    isFree: false,
    priceFrom: 249,
    certificationAvailable: true,
    certificationName: "ACLS Provider",
    requirements: "Current BLS certification required.",
    cancellationPolicy: "Full refund up to 14 days before start.",
    revenueTotal: 2988,
  });

  const evtItSec = await upsertEvent(orgId, catItSecurity.id, {
    slug: "it-security-awareness",
    title: "IT Security Awareness",
    description: "Phishing, password hygiene, and device security essentials for distributed teams.",
    shortDescription: "Cybersecurity basics for all staff.",
    imageUrl: DEMO_IMAGES.it,
    eventType: "online_training",
    deliveryMode: "online",
    status: "registration_open",
    instructorName: "Alex Chen",
    instructorUserId: instructorId,
    startsAt: daysFromNow(12, 14),
    endsAt: daysFromNow(12, 16),
    venueName: null,
    venueAddress: null,
    venueCity: null,
    venueState: null,
    venuePostalCode: null,
    venueCountry: null,
    venueLat: null,
    venueLng: null,
    onlineMeetingUrl: "https://meet.example.com/it-security",
    capacity: 200,
    registeredCount: 156,
    isPublic: true,
    isFree: true,
    priceFrom: 0,
    certificationAvailable: false,
    certificationName: null,
    requirements: null,
    cancellationPolicy: null,
    revenueTotal: 0,
  });

  const evtHipaa = await upsertEvent(orgId, catCompliance.id, {
    slug: "hipaa-compliance-data-protection",
    title: "HIPAA Compliance & Data Protection",
    description: "Protect PHI in the field: documentation, devices, and incident reporting.",
    shortDescription: "HIPAA essentials for medical responders.",
    imageUrl: DEMO_IMAGES.hipaa,
    eventType: "live_workshop",
    deliveryMode: "online",
    status: "registration_open",
    instructorName: "Jordan Lee",
    instructorUserId: instructorId,
    startsAt: daysFromNow(40, 13),
    endsAt: daysFromNow(40, 16),
    venueName: null,
    venueAddress: null,
    venueCity: null,
    venueState: null,
    venuePostalCode: null,
    venueCountry: null,
    venueLat: null,
    venueLng: null,
    onlineMeetingUrl: "https://meet.example.com/hipaa",
    capacity: 120,
    registeredCount: 67,
    isPublic: true,
    isFree: false,
    priceFrom: 99,
    certificationAvailable: true,
    certificationName: "HIPAA Awareness",
    requirements: "Access to company LMS account.",
    cancellationPolicy: "Full refund up to 3 days before start.",
    revenueTotal: 6633,
  });

  const evtSafety = await upsertEvent(orgId, catSafety.id, {
    slug: "q2-safety-briefing",
    title: "Q2 Safety Briefing — Field Operations",
    description: "Mandatory quarterly safety briefing for all active field staff.",
    shortDescription: "Mandatory quarterly safety briefing.",
    imageUrl: null,
    eventType: "safety_briefing",
    deliveryMode: "online",
    status: "completed",
    instructorName: "Ops Team",
    instructorUserId: null,
    startsAt: daysFromNow(-30, 10),
    endsAt: daysFromNow(-30, 11),
    venueName: null,
    venueAddress: null,
    venueCity: null,
    venueState: null,
    venuePostalCode: null,
    venueCountry: null,
    venueLat: null,
    venueLng: null,
    onlineMeetingUrl: "https://meet.example.com/q2-safety",
    capacity: null,
    registeredCount: 1,
    isPublic: false,
    isFree: true,
    priceFrom: 0,
    certificationAvailable: false,
    certificationName: null,
    requirements: null,
    cancellationPolicy: null,
    revenueTotal: 0,
  });

  const tktCpr = await upsertTicket(orgId, evtCpr.id, {
    name: "Standard seat",
    description: "Includes skills lab and digital card",
    price: 149,
    quantity: 30,
    soldCount: 20,
    saleStartsAt: daysFromNow(-60),
    saleEndsAt: daysFromNow(17),
    isFree: false,
  });

  await upsertTicket(orgId, evtDrug.id, {
    name: "Workshop access",
    description: "Live online session + materials",
    price: 79,
    quantity: 80,
    soldCount: 45,
    saleStartsAt: daysFromNow(-10),
    saleEndsAt: daysFromNow(21),
    isFree: false,
  });

  await upsertTicket(orgId, evtSecOps.id, {
    name: "Full day workshop",
    description: "In-person training and certification exam",
    price: 199,
    quantity: 25,
    soldCount: 18,
    saleStartsAt: daysFromNow(-5),
    saleEndsAt: daysFromNow(27),
    isFree: false,
  });

  await upsertTicket(orgId, evtAcls.id, {
    name: "ACLS provider",
    description: "Includes simulation lab and card",
    price: 249,
    quantity: 20,
    soldCount: 12,
    saleStartsAt: daysFromNow(-15),
    saleEndsAt: daysFromNow(34),
    isFree: false,
  });

  await upsertTicket(orgId, evtItSec.id, {
    name: "Free registration",
    description: "Open to all staff",
    price: 0,
    quantity: 200,
    soldCount: 156,
    saleStartsAt: null,
    saleEndsAt: null,
    isFree: true,
  });

  await upsertTicket(orgId, evtHipaa.id, {
    name: "General admission",
    description: "Live webinar + certificate",
    price: 99,
    quantity: 120,
    soldCount: 67,
    saleStartsAt: daysFromNow(-7),
    saleEndsAt: daysFromNow(39),
    isFree: false,
  });

  await upsertTicket(orgId, evtMed.id, {
    name: "Full program",
    description: "Hybrid attendance + certification exam",
    price: 249,
    quantity: 40,
    soldCount: 0,
    saleStartsAt: daysFromNow(-20),
    saleEndsAt: daysFromNow(44),
    isFree: false,
  });

  const tktBgFree = await upsertTicket(orgId, evtBg.id, {
    name: "Free registration",
    description: "Online access link sent after signup",
    price: 0,
    quantity: 100,
    soldCount: 0,
    saleStartsAt: null,
    saleEndsAt: null,
    isFree: true,
  });

  const attendeeName = student.name?.trim() || "Demo Student";
  const attendeeEmail = student.email || "staff@example.com";

  const regCpr = await upsertRegistration(orgId, studentId, evtCpr.id, tktCpr.id, {
    bookingStatus: "confirmed",
    attendeeName,
    attendeeEmail,
    paymentStatus: "paid",
    amountPaid: 149,
    registeredAt: daysFromNow(-5),
    checkedInAt: null,
    qrToken: "QR-EVT-CPR-DEMO-001",
  });

  const regSafety = await upsertRegistration(orgId, studentId, evtSafety.id, tktBgFree.id, {
    bookingStatus: "completed",
    attendeeName,
    attendeeEmail,
    paymentStatus: "comped",
    amountPaid: 0,
    registeredAt: daysFromNow(-45),
    checkedInAt: daysFromNow(-30, 10),
    qrToken: "QR-EVT-SAFETY-DEMO-002",
  });

  const existingCert = await prisma.lmsEventCertificate.findFirst({
    where: { registrationId: regSafety.id },
  });
  if (!existingCert) {
    await prisma.lmsEventCertificate.create({
      data: {
        organizationId: orgId,
        eventId: evtSafety.id,
        registrationId: regSafety.id,
        studentUserId: studentId,
        studentName: attendeeName,
        eventTitle: evtSafety.title,
        certificateStatus: "issued",
        issuedAt: daysFromNow(-29),
        expiresAt: daysFromNow(335),
        renewalRequired: true,
        templateId: "tpl-default",
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }

  const existingTxn = await prisma.lmsEventTransaction.findFirst({
    where: { registrationId: regCpr.id },
  });
  if (!existingTxn) {
    await prisma.lmsEventTransaction.create({
      data: {
        organizationId: orgId,
        eventId: evtCpr.id,
        registrationId: regCpr.id,
        attendeeName,
        amount: 149,
        currency: "USD",
        method: "card",
        status: "completed",
        processedAt: daysFromNow(-5),
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }

  const existingSupport = await prisma.lmsEventSupportTicket.findFirst({
    where: { organizationId: orgId, studentUserId: studentId, subject: "Need to reschedule CPR lab" },
  });
  if (!existingSupport) {
    await prisma.lmsEventSupportTicket.create({
      data: {
        organizationId: orgId,
        eventId: evtCpr.id,
        registrationId: regCpr.id,
        studentUserId: studentId,
        subject: "Need to reschedule CPR lab",
        status: "open",
        priority: "normal",
        lastReplyAt: daysFromNow(-1),
        createdById: studentId,
        updatedById: studentId,
      },
    });
  }

  const existingNtf = await prisma.lmsEventNotification.findFirst({
    where: { organizationId: orgId, userId: studentId, title: "CPR Recertification starts in 14 days" },
  });
  if (!existingNtf) {
    await prisma.lmsEventNotification.create({
      data: {
        organizationId: orgId,
        userId: studentId,
        eventId: evtCpr.id,
        kind: "event_reminder",
        title: "CPR Recertification starts in 14 days",
        body: "Your hands-on lab is scheduled for next month. Review pre-course materials in My Events.",
        createdById: orgId,
        updatedById: orgId,
      },
    });
  }

  const existingWish = await prisma.lmsEventWishlistItem.findFirst({
    where: { organizationId: orgId, studentUserId: studentId, eventId: evtMed.id },
  });
  if (!existingWish) {
    await prisma.lmsEventWishlistItem.create({
      data: {
        organizationId: orgId,
        eventId: evtMed.id,
        studentUserId: studentId,
        createdById: studentId,
        updatedById: studentId,
      },
    });
  }

  console.log("[seed-lms-events] Done.");
  console.log(
    "  Events: CPR & First Aid, Drug Screening, Security Ops, ACLS, IT Security, HIPAA, BG workshop, Medical lead, Q2 safety",
  );
  console.log(`  Student ${student.email}: registered for CPR + safety briefing, 1 certificate, 1 wishlist item`);
}

main()
  .catch((err) => {
    console.error("[seed-lms-events] failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
