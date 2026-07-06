/* eslint-disable no-console */
/**
 * Seed demo Sales Invoices and Sales Proposals for the Accounting module.
 *
 * Usage:
 *   npm run db:seed:sales-invoices-proposals
 *   npm run db:seed:sales-invoices-proposals:force
 *   node ./scripts/seed-sales-invoices-proposals-demo.js --email=tommy@firstaidresponders.net
 */
const path = require("node:path");
const crypto = require("node:crypto");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const FORCE = process.argv.includes("--force");

function readArg(prefix) {
  const hit = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return hit ? hit.slice(prefix.length + 1).trim() : null;
}

const FILTER_EMAIL = readArg("--email");
const FILTER_NAME = readArg("--name");

function utcDateOnly(d = new Date()) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return utcDateOnly(x);
}

function paymentToken() {
  return crypto.randomBytes(16).toString("hex");
}

function shortCode(projectName, customerCode) {
  const fromProject = (projectName ?? "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  if (fromProject.length >= 2) return fromProject;
  return (customerCode ?? "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "INV";
}

function invoiceLine(desc, qty, unitPrice, taxPct = 0) {
  const lineTotal = qty * unitPrice;
  const taxAmount = (lineTotal * taxPct) / 100;
  return {
    description: desc,
    quantity: qty,
    unitPrice,
    taxPercentage: taxPct,
    taxAmount,
    totalAmount: lineTotal + taxAmount,
  };
}

function proposalLine(desc, qty, unitPrice, discPct = 0, taxPct = 0) {
  const lineTotal = qty * unitPrice;
  const discountAmount = (lineTotal * discPct) / 100;
  const afterDisc = lineTotal - discountAmount;
  const taxAmount = (afterDisc * taxPct) / 100;
  return {
    productId: null,
    description: desc,
    quantity: qty,
    unitPrice,
    discountPercentage: discPct,
    discountAmount,
    taxPercentage: taxPct,
    taxAmount,
    totalAmount: afterDisc + taxAmount,
  };
}

function sumInvoiceLines(lines) {
  let subtotal = 0;
  let taxAmount = 0;
  for (const l of lines) {
    subtotal += l.quantity * l.unitPrice;
    taxAmount += l.taxAmount;
  }
  return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
}

function sumProposalLines(lines) {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;
  for (const l of lines) {
    subtotal += l.quantity * l.unitPrice;
    discountAmount += l.discountAmount;
    taxAmount += l.taxAmount;
  }
  return { subtotal, taxAmount, discountAmount, totalAmount: subtotal - discountAmount + taxAmount };
}

async function wipeSalesData(companyId) {
  await prisma.salesInvoiceItem.deleteMany({ where: { invoice: { createdBy: companyId } } });
  await prisma.salesInvoice.deleteMany({ where: { createdBy: companyId } });
  await prisma.salesProposalItem.deleteMany({ where: { proposal: { createdBy: companyId } } });
  await prisma.salesProposal.deleteMany({ where: { createdBy: companyId } });
}

async function ensureCustomers(companyId, creatorId) {
  const existing = await prisma.customer.findMany({
    where: { createdBy: companyId },
    orderBy: { id: "asc" },
    take: 12,
  });
  if (existing.length >= 3) return existing;

  const demos = [
    {
      customerCode: "DEMO-C001",
      companyName: "Metro Health Clinic",
      contactPersonName: "Dr. Sarah Mitchell",
      contactPersonEmail: "billing@metrohealth.demo",
      contactPersonMobile: "+1-215-555-0101",
    },
    {
      customerCode: "DEMO-C002",
      companyName: "Summit Construction Group",
      contactPersonName: "James Porter",
      contactPersonEmail: "accounts@summitconstruction.demo",
      contactPersonMobile: "+1-267-555-0202",
    },
    {
      customerCode: "DEMO-C003",
      companyName: "Riverview School District",
      contactPersonName: "Maria Gonzalez",
      contactPersonEmail: "procurement@riverviewschools.demo",
      contactPersonMobile: "+1-610-555-0303",
    },
    {
      customerCode: "DEMO-C004",
      companyName: "Liberty Event Services",
      contactPersonName: "Chris Anderson",
      contactPersonEmail: "finance@libertyevents.demo",
      contactPersonMobile: "+1-484-555-0404",
    },
    {
      customerCode: "DEMO-C005",
      companyName: "Northgate Manufacturing",
      contactPersonName: "Patricia Lee",
      contactPersonEmail: "ap@northgatemfg.demo",
      contactPersonMobile: "+1-302-555-0505",
    },
  ];

  for (const row of demos) {
    const hit = await prisma.customer.findFirst({
      where: { createdBy: companyId, customerCode: row.customerCode },
    });
    if (!hit) {
      await prisma.customer.create({
        data: {
          ...row,
          billingAddress: { line1: "100 Demo St", city: "Philadelphia", state: "PA", country: "USA" },
          sameAsBilling: true,
          creatorId,
          createdBy: companyId,
        },
      });
    }
  }

  return prisma.customer.findMany({
    where: { createdBy: companyId },
    orderBy: { id: "asc" },
    take: 12,
  });
}

async function seedInvoices(companyId, creatorId, customers) {
  const today = utcDateOnly();
  const specs = [
    {
      projectName: "CPR Certification Training",
      invoiceDate: addDays(today, -45),
      dueDate: addDays(today, -15),
      paidAmount: 2850,
      lines: [
        invoiceLine("On-site CPR/AED training (25 participants)", 1, 2200, 8),
        invoiceLine("Training materials & certificates", 25, 26, 0),
      ],
    },
    {
      projectName: "Workplace First Aid Audit",
      invoiceDate: addDays(today, -30),
      dueDate: addDays(today, 0),
      paidAmount: 0,
      lines: [invoiceLine("OSHA first aid compliance assessment", 1, 1850, 8)],
    },
    {
      projectName: "AED Program Setup",
      invoiceDate: addDays(today, -22),
      dueDate: addDays(today, 8),
      paidAmount: 1200,
      lines: [
        invoiceLine("AED unit installation & configuration", 2, 650, 8),
        invoiceLine("Staff orientation session", 1, 450, 0),
      ],
    },
    {
      projectName: "Emergency Responder Retainer",
      invoiceDate: addDays(today, -18),
      dueDate: addDays(today, 12),
      paidAmount: 5000,
      lines: [invoiceLine("Monthly on-site responder coverage", 1, 5000, 0)],
    },
    {
      projectName: "First Aid Supply Restock",
      invoiceDate: addDays(today, -12),
      dueDate: addDays(today, 18),
      paidAmount: 0,
      lines: [
        invoiceLine("Industrial first aid cabinet refill", 4, 185, 8),
        invoiceLine("Trauma kit upgrade pack", 2, 240, 8),
      ],
    },
    {
      projectName: "Sports Event Medical Standby",
      invoiceDate: addDays(today, -8),
      dueDate: addDays(today, 22),
      paidAmount: 3200,
      lines: [invoiceLine("Event medical team (8 hours)", 1, 3200, 0)],
    },
    {
      projectName: "Blended Learning LMS Access",
      invoiceDate: addDays(today, -5),
      dueDate: addDays(today, 25),
      paidAmount: 0,
      lines: [
        invoiceLine("Annual LMS seat license", 50, 18, 0),
        invoiceLine("Course content customization", 1, 900, 8),
      ],
    },
    {
      projectName: "Corporate Wellness Workshop",
      invoiceDate: addDays(today, -2),
      dueDate: addDays(today, 28),
      paidAmount: 1750,
      lines: [invoiceLine("Half-day emergency preparedness workshop", 1, 1750, 0)],
    },
  ];

  let seq = await prisma.salesInvoice.count({ where: { createdBy: companyId } });

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const customer = customers[i % customers.length];
    const totals = sumInvoiceLines(spec.lines);
    const paid = Math.min(spec.paidAmount, totals.totalAmount);
    const status = paid >= totals.totalAmount ? "paid" : paid > 0 ? "partially_paid" : "unpaid";
    seq += 1;

    const invoice = await prisma.salesInvoice.create({
      data: {
        invoiceNumber: `INV#${String(seq).padStart(3, "0")}`,
        shortCode: shortCode(spec.projectName, customer.customerCode),
        invoiceDate: spec.invoiceDate,
        dueDate: spec.dueDate,
        customerId: customer.id,
        projectName: spec.projectName,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: 0,
        totalAmount: totals.totalAmount,
        paidAmount: paid,
        status,
        notes: "Demo invoice — seeded for UI testing.",
        terms: "Net 30. Thank you for your business.",
        paymentToken: paymentToken(),
        creatorId,
        createdBy: companyId,
      },
    });

    for (const line of spec.lines) {
      await prisma.salesInvoiceItem.create({
        data: { invoiceId: invoice.id, ...line },
      });
    }
  }

  return specs.length;
}

async function seedProposals(companyId, creatorId) {
  const today = utcDateOnly();
  const leads = await prisma.crmLead.findMany({
    where: { createdBy: companyId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, firstName: true, lastName: true, name: true, email: true, company: true },
  });
  const deals = await prisma.crmDeal.findMany({
    where: { createdBy: companyId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, name: true, leadId: true },
  });

  const specs = [
    {
      status: "draft",
      proposalDate: addDays(today, -20),
      dueDate: addDays(today, 10),
      description: "Annual workplace safety training proposal",
      lines: [
        proposalLine("CPR/AED instructor-led sessions", 6, 950, 5, 8),
        proposalLine("Digital course library access", 1, 1200, 0, 0),
      ],
    },
    {
      status: "sent",
      proposalDate: addDays(today, -14),
      dueDate: addDays(today, 16),
      description: "On-site medical standby for corporate events",
      lines: [proposalLine("Certified responder team (per event day)", 4, 1800, 0, 8)],
    },
    {
      status: "sent",
      proposalDate: addDays(today, -10),
      dueDate: addDays(today, 5),
      description: "School district emergency preparedness package",
      lines: [
        proposalLine("Staff training workshops", 3, 1400, 10, 8),
        proposalLine("First aid station setup", 5, 320, 0, 8),
      ],
    },
    {
      status: "accepted",
      proposalDate: addDays(today, -35),
      dueDate: addDays(today, -5),
      description: "Manufacturing plant compliance program",
      lines: [proposalLine("OSHA first aid program design & rollout", 1, 6800, 0, 8)],
    },
    {
      status: "rejected",
      proposalDate: addDays(today, -28),
      dueDate: addDays(today, -8),
      description: "Pop-up clinic staffing proposal",
      lines: [proposalLine("Temporary clinic staffing (weekly)", 8, 2400, 0, 8)],
    },
    {
      status: "draft",
      proposalDate: addDays(today, -6),
      dueDate: addDays(today, 24),
      description: "AED maintenance & inspection contract",
      lines: [
        proposalLine("Quarterly AED inspection visits", 4, 275, 0, 8),
        proposalLine("Replacement pads & batteries kit", 4, 190, 0, 8),
      ],
    },
    {
      status: "sent",
      proposalDate: addDays(today, -3),
      dueDate: addDays(today, -1),
      description: "Overdue demo proposal for filter testing",
      lines: [proposalLine("Emergency response retainer (Q2)", 1, 4200, 0, 0)],
    },
    {
      status: "accepted",
      proposalDate: addDays(today, -18),
      dueDate: addDays(today, 12),
      description: "Hybrid training & certification bundle",
      lines: [
        proposalLine("Blended CPR certification seats", 40, 85, 0, 0),
        proposalLine("Skills verification lab day", 1, 1600, 0, 8),
      ],
    },
  ];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const lead = leads[i % Math.max(leads.length, 1)] ?? null;
    const deal = deals[i % Math.max(deals.length, 1)] ?? null;
    const totals = sumProposalLines(spec.lines);
    const y = spec.proposalDate.getUTCFullYear();
    const m = String(spec.proposalDate.getUTCMonth() + 1).padStart(2, "0");
    const proposalNumber = `SP-${y}-${m}-${String(1000 + i)}`;

    const proposal = await prisma.salesProposal.create({
      data: {
        proposalNumber,
        proposalDate: spec.proposalDate,
        dueDate: spec.dueDate,
        customerId: companyId,
        leadId: lead?.id ?? null,
        dealId: deal?.id ?? null,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        totalAmount: totals.totalAmount,
        status: spec.status,
        currency: "USD",
        calculateTax: "after_discount",
        description: spec.description,
        paymentTerms: "Net 30",
        notes: "Demo proposal — seeded for UI testing.",
        requireSignature: true,
        creatorId,
        createdBy: companyId,
      },
    });

    for (const line of spec.lines) {
      await prisma.salesProposalItem.create({
        data: { proposalId: proposal.id, ...line },
      });
    }
  }

  return specs.length;
}

async function seedCompany(company) {
  const companyId = company.id;
  const creatorId = companyId;

  const existingInvoices = await prisma.salesInvoice.count({ where: { createdBy: companyId } });
  const existingProposals = await prisma.salesProposal.count({ where: { createdBy: companyId } });

  if ((existingInvoices > 0 || existingProposals > 0) && !FORCE) {
    console.log(
      `[sales-seed] Skipping ${company.name ?? company.email} — found ${existingInvoices} invoices, ${existingProposals} proposals (use --force to replace).`,
    );
    return;
  }

  if (FORCE && (existingInvoices > 0 || existingProposals > 0)) {
    await wipeSalesData(companyId);
    console.log(`[sales-seed] Cleared existing invoices/proposals for ${company.name ?? company.email}.`);
  }

  const customers = await ensureCustomers(companyId, creatorId);
  if (!customers.length) {
    console.error(`[sales-seed] No customers available for company ${company.id}.`);
    return;
  }

  const invoiceCount = await seedInvoices(companyId, creatorId, customers);
  const proposalCount = await seedProposals(companyId, creatorId);

  console.log(
    `[sales-seed] ✓ ${company.name ?? company.email}: ${invoiceCount} invoices, ${proposalCount} proposals (${customers.length} customers).`,
  );
}

async function main() {
  console.log("[sales-seed] Starting sales invoices & proposals demo seed…");

  const where = { type: "company", isActive: true };
  if (FILTER_EMAIL) where.email = { equals: FILTER_EMAIL, mode: "insensitive" };
  if (FILTER_NAME) where.name = { contains: FILTER_NAME, mode: "insensitive" };

  const companies = await prisma.user.findMany({
    where,
    orderBy: { id: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!companies.length) {
    console.error("[sales-seed] No company user found.");
    process.exit(1);
  }

  for (const company of companies) {
    await seedCompany(company);
  }

  console.log("[sales-seed] Done.");
}

main()
  .catch((err) => {
    console.error("[sales-seed] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
