/* eslint-disable no-console */
/**
 * Comprehensive demo data seed.
 * Idempotent — uses skipDuplicates / upsert throughout.
 * Safe to re-run on every deployment.
 *
 * Covers: Accounting, Taskly (Projects), Helpdesk, and full HRM add-on.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const { syncCrmPostgresSequences } = require("./sync-crm-postgres-sequences");
const prisma = new PrismaClient({ log: ["error"] });

// Company owner user id (created by seed-rbac-demo.js)
const CO = 1000n;
const now = new Date();

function d(str) { return new Date(str); }
function bi(n) { return BigInt(n); }

// ─── Helper: auto-pick next safe ID above given floor ─────────────────────────
async function nextId(table, floor = 1000) {
  const res = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(MAX(id), 0) AS mx FROM ${table}`
  );
  const mx = Number(res[0].mx);
  return BigInt(Math.max(mx + 1, floor));
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("[demo-seed] Starting comprehensive demo data seed…");

  // ── 1. WAREHOUSES ──────────────────────────────────────────────────────────
  console.log("[demo-seed] Warehouses…");
  await prisma.warehouse.createMany({
    data: [
      { id: bi(1001), name: "Main Warehouse", address: "100 Commerce St", city: "New York", zipCode: "10001", phone: "+1-212-555-0100", email: "main@warehouse.demo", isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(1002), name: "North Distribution Center", address: "500 Industrial Blvd", city: "Chicago", zipCode: "60601", phone: "+1-312-555-0200", email: "north@warehouse.demo", isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(1003), name: "South Fulfillment Hub", address: "200 Harbor Dr", city: "Miami", zipCode: "33101", phone: "+1-305-555-0300", email: "south@warehouse.demo", isActive: true, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── 2. ADDITIONAL CUSTOMERS ────────────────────────────────────────────────
  console.log("[demo-seed] Customers…");
  await prisma.customer.createMany({
    data: [
      { id: bi(1001), customerCode: "CUST-1001", companyName: "Summit Tech Solutions", contactPersonName: "Alex Turner", contactPersonEmail: "alex@summittech.demo", contactPersonMobile: "+1-415-555-0101", taxNumber: "TAX-9001", billingAddress: { line1: "1 Market St", city: "San Francisco", country: "USA" }, sameAsBilling: true, creatorId: CO, createdBy: CO },
      { id: bi(1002), customerCode: "CUST-1002", companyName: "BlueSky Enterprises", contactPersonName: "Priya Sharma", contactPersonEmail: "priya@bluesky.demo", contactPersonMobile: "+1-206-555-0202", taxNumber: "TAX-9002", billingAddress: { line1: "500 Pine St", city: "Seattle", country: "USA" }, sameAsBilling: true, creatorId: CO, createdBy: CO },
      { id: bi(1003), customerCode: "CUST-1003", companyName: "GreenLeaf Industries", contactPersonName: "Carlos Mendez", contactPersonEmail: "carlos@greenleaf.demo", contactPersonMobile: "+1-512-555-0303", taxNumber: "TAX-9003", billingAddress: { line1: "99 Congress Ave", city: "Austin", country: "USA" }, sameAsBilling: true, creatorId: CO, createdBy: CO },
      { id: bi(1004), customerCode: "CUST-1004", companyName: "Apex Financial Group", contactPersonName: "Lisa Wang", contactPersonEmail: "lisa@apexfin.demo", contactPersonMobile: "+1-617-555-0404", taxNumber: "TAX-9004", billingAddress: { line1: "200 State St", city: "Boston", country: "USA" }, sameAsBilling: true, creatorId: CO, createdBy: CO },
      { id: bi(1005), customerCode: "CUST-1005", companyName: "Orion Logistics", contactPersonName: "James Robinson", contactPersonEmail: "james@orionlog.demo", contactPersonMobile: "+1-469-555-0505", taxNumber: "TAX-9005", billingAddress: { line1: "400 Main St", city: "Dallas", country: "USA" }, sameAsBilling: true, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── 3. ADDITIONAL VENDORS ──────────────────────────────────────────────────
  console.log("[demo-seed] Vendors…");
  await prisma.vendor.createMany({
    data: [
      { id: bi(1001), name: "CloudPrint Supply Co.", companyName: "CloudPrint Supply", email: "orders@cloudprint.demo", phone: "+1-800-555-0601", status: "active", billingAddress: "1 Printer Lane", billingCity: "Portland", billingState: "OR", billingPostalCode: "97201", billingCountry: "USA", sameAsBilling: true, createdBy: CO },
      { id: bi(1002), name: "Swift Office Supplies", companyName: "Swift Office", email: "sales@swiftoffice.demo", phone: "+1-800-555-0602", status: "active", billingAddress: "77 Supply Ave", billingCity: "Phoenix", billingState: "AZ", billingPostalCode: "85001", billingCountry: "USA", sameAsBilling: true, createdBy: CO },
      { id: bi(1003), name: "TechParts Direct", companyName: "TechParts Direct", email: "info@techpartsdirect.demo", phone: "+1-800-555-0603", status: "active", billingAddress: "500 Industrial Park", billingCity: "Detroit", billingState: "MI", billingPostalCode: "48201", billingCountry: "USA", sameAsBilling: true, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── 3b. BANK ACCOUNTS (ids 5–7: referenced by demo revenues, expenses, payments, transfers)
  console.log("[demo-seed] Bank accounts (demo)…");
  await prisma.bankAccount.createMany({
    data: [
      {
        id: bi(5),
        accountNumber: "DEMO-CHK-5001",
        accountName: "Primary Operating",
        bankName: "Demo National Bank",
        branchName: "Main",
        accountType: "0",
        openingBalance: 250000,
        currentBalance: 250000,
        isActive: true,
        creatorId: CO,
        createdBy: CO,
      },
      {
        id: bi(6),
        accountNumber: "DEMO-SAV-6001",
        accountName: "Payroll Reserve",
        bankName: "Demo National Bank",
        branchName: "North",
        accountType: "1",
        openingBalance: 120000,
        currentBalance: 120000,
        isActive: true,
        creatorId: CO,
        createdBy: CO,
      },
      {
        id: bi(7),
        accountNumber: "DEMO-CC-7001",
        accountName: "Online Collections",
        bankName: "Metro Credit Union",
        branchName: null,
        accountType: "0",
        openingBalance: 45000,
        currentBalance: 45000,
        isActive: true,
        creatorId: CO,
        createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });

  // ── 3c. BANK TRANSACTIONS (for Bank Transactions list; scoped by createdBy company user)
  console.log("[demo-seed] Bank transactions (demo)…");
  await prisma.bankTransaction.createMany({
    data: [
      {
        id: bi(1001),
        bankAccountId: bi(5),
        transactionDate: d("2026-01-05"),
        referenceNumber: "BTXN-DEMO-001",
        description: "Incoming wire — customer batch",
        type: "credit",
        amount: 45000,
        balanceAfter: 295000,
        category: "Deposit",
        creatorId: CO,
        createdBy: CO,
      },
      {
        id: bi(1002),
        bankAccountId: bi(5),
        transactionDate: d("2026-02-12"),
        referenceNumber: "BTXN-DEMO-002",
        description: "Vendor payment — office rent",
        type: "debit",
        amount: 12400,
        balanceAfter: 282600,
        category: "Payment",
        creatorId: CO,
        createdBy: CO,
      },
      {
        id: bi(1003),
        bankAccountId: bi(6),
        transactionDate: d("2026-03-01"),
        referenceNumber: "BTXN-DEMO-003",
        description: "Internal transfer in from operating",
        type: "credit",
        amount: 15000,
        balanceAfter: 135000,
        category: "Transfer",
        creatorId: CO,
        createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });

  // ── 3d. CHART OF ACCOUNTS scaffolding (category → type → GL accounts for COA UI)
  console.log("[demo-seed] Account categories / types / chart of accounts (demo)…");
  await prisma.accountCategory.createMany({
    data: [
      {
        id: bi(5001),
        name: "Operating (demo)",
        code: "OP-DEMO",
        type: "revenue",
        description: "Demo category for chart account types",
        isActive: true,
        creatorId: CO,
        createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });
  await prisma.accountType.createMany({
    data: [
      {
        id: bi(5101),
        categoryId: bi(5001),
        name: "General Ledger Accounts",
        code: "GL-DEMO",
        normalBalance: "debit",
        description: "Demo type for chart of accounts",
        isActive: true,
        creatorId: CO,
        createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });
  await prisma.chartOfAccount.createMany({
    data: [
      {
        id: bi(5201),
        accountCode: "1000-DEMO",
        accountName: "Cash on Hand",
        accountTypeId: bi(5101),
        level: 1,
        normalBalance: "debit",
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
        creatorId: CO,
        createdBy: CO,
      },
      {
        id: bi(5202),
        accountCode: "2000-DEMO",
        accountName: "Accounts Payable — Demo",
        accountTypeId: bi(5101),
        level: 1,
        normalBalance: "credit",
        openingBalance: 0,
        currentBalance: 0,
        isActive: true,
        creatorId: CO,
        createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });

  // ── 4. REVENUES (Accounting) ───────────────────────────────────────────────
  console.log("[demo-seed] Revenues…");
  const revenueData = [
    { id: bi(1001), referenceNumber: "REV-DEMO-001", customerId: bi(1), date: d("2026-01-10"), amount: 45000, category: "Sales", description: "Q1 Software License", bankAccountId: bi(5), paymentMethod: "bank_transfer", status: "received", creatorId: CO, createdBy: CO },
    { id: bi(1002), referenceNumber: "REV-DEMO-002", customerId: bi(2), date: d("2026-01-22"), amount: 22500, category: "Services", description: "Consulting Services Jan", bankAccountId: bi(5), paymentMethod: "bank_transfer", status: "received", creatorId: CO, createdBy: CO },
    { id: bi(1003), referenceNumber: "REV-DEMO-003", customerId: bi(3), date: d("2026-02-05"), amount: 18750, category: "Sales", description: "Hardware Products", bankAccountId: bi(6), paymentMethod: "cheque", status: "received", creatorId: CO, createdBy: CO },
    { id: bi(1004), referenceNumber: "REV-DEMO-004", customerId: bi(1001), date: d("2026-02-14"), amount: 67000, category: "Services", description: "Annual Maintenance Contract", bankAccountId: bi(5), paymentMethod: "bank_transfer", status: "received", creatorId: CO, createdBy: CO },
    { id: bi(1005), referenceNumber: "REV-DEMO-005", customerId: bi(1002), date: d("2026-02-28"), amount: 31200, category: "Sales", description: "E-commerce Platform Setup", bankAccountId: bi(7), paymentMethod: "online", status: "received", creatorId: CO, createdBy: CO },
    { id: bi(1006), referenceNumber: "REV-DEMO-006", customerId: bi(1003), date: d("2026-03-05"), amount: 15500, category: "Services", description: "SEO & Marketing Services", bankAccountId: bi(6), paymentMethod: "bank_transfer", status: "pending", creatorId: CO, createdBy: CO },
    { id: bi(1007), referenceNumber: "REV-DEMO-007", customerId: bi(1004), date: d("2026-03-10"), amount: 88000, category: "Sales", description: "Enterprise Software Suite", bankAccountId: bi(5), paymentMethod: "bank_transfer", status: "received", creatorId: CO, createdBy: CO },
    { id: bi(1008), referenceNumber: "REV-DEMO-008", customerId: bi(1005), date: d("2026-03-15"), amount: 9800, category: "Services", description: "Training & Support Package", bankAccountId: bi(7), paymentMethod: "online", status: "pending", creatorId: CO, createdBy: CO },
  ];
  await prisma.revenue.createMany({ data: revenueData, skipDuplicates: true });

  // ── 5. EXPENSES (Accounting) ───────────────────────────────────────────────
  console.log("[demo-seed] Expenses…");
  const expenseData = [
    { id: bi(1001), referenceNumber: "EXP-DEMO-001", vendorId: bi(1), date: d("2026-01-08"), amount: 5200, category: "Utilities", description: "Office Electricity & Internet Jan", bankAccountId: bi(5), paymentMethod: "bank_transfer", status: "paid", creatorId: CO, createdBy: CO },
    { id: bi(1002), referenceNumber: "EXP-DEMO-002", vendorId: bi(2), date: d("2026-01-15"), amount: 12400, category: "Rent", description: "Office Rent January", bankAccountId: bi(5), paymentMethod: "bank_transfer", status: "paid", creatorId: CO, createdBy: CO },
    { id: bi(1003), referenceNumber: "EXP-DEMO-003", vendorId: bi(3), date: d("2026-01-25"), amount: 3800, category: "Office Supplies", description: "Stationery & Printing Q1", bankAccountId: bi(6), paymentMethod: "cheque", status: "paid", creatorId: CO, createdBy: CO },
    { id: bi(1004), referenceNumber: "EXP-DEMO-004", vendorId: bi(1001), date: d("2026-02-10"), amount: 8500, category: "Equipment", description: "Printer & Copier Lease", bankAccountId: bi(5), paymentMethod: "bank_transfer", status: "paid", creatorId: CO, createdBy: CO },
    { id: bi(1005), referenceNumber: "EXP-DEMO-005", vendorId: bi(1002), date: d("2026-02-20"), amount: 6700, category: "Office Supplies", description: "Furniture & Fixtures", bankAccountId: bi(6), paymentMethod: "bank_transfer", status: "paid", creatorId: CO, createdBy: CO },
    { id: bi(1006), referenceNumber: "EXP-DEMO-006", vendorId: bi(4), date: d("2026-02-25"), amount: 14200, category: "Software", description: "SaaS Subscriptions Q1", bankAccountId: bi(7), paymentMethod: "online", status: "paid", creatorId: CO, createdBy: CO },
    { id: bi(1007), referenceNumber: "EXP-DEMO-007", vendorId: bi(1003), date: d("2026-03-01"), amount: 22000, category: "Equipment", description: "Server Hardware Upgrade", bankAccountId: bi(5), paymentMethod: "bank_transfer", status: "pending", creatorId: CO, createdBy: CO },
    { id: bi(1008), referenceNumber: "EXP-DEMO-008", vendorId: bi(5), date: d("2026-03-12"), amount: 4100, category: "Marketing", description: "Digital Advertising March", bankAccountId: bi(6), paymentMethod: "online", status: "paid", creatorId: CO, createdBy: CO },
  ];
  await prisma.expense.createMany({ data: expenseData, skipDuplicates: true });

  // ── 6. CUSTOMER PAYMENTS ───────────────────────────────────────────────────
  console.log("[demo-seed] Customer Payments…");
  await prisma.customerPayment.createMany({
    data: [
      { id: bi(1001), referenceNumber: "CP-DEMO-001", customerId: bi(1), paymentDate: d("2026-01-12"), amount: 12500, paymentMethod: "bank_transfer", bankAccountId: bi(5), status: "completed", notes: "Payment for Jan invoice", creatorId: CO, createdBy: CO },
      { id: bi(1002), referenceNumber: "CP-DEMO-002", customerId: bi(2), paymentDate: d("2026-01-28"), amount: 8750, paymentMethod: "cheque", bankAccountId: bi(5), status: "completed", notes: "Cheque cleared", creatorId: CO, createdBy: CO },
      { id: bi(1003), referenceNumber: "CP-DEMO-003", customerId: bi(1001), paymentDate: d("2026-02-16"), amount: 67000, paymentMethod: "bank_transfer", bankAccountId: bi(5), status: "completed", notes: "Full payment for maintenance contract", creatorId: CO, createdBy: CO },
      { id: bi(1004), referenceNumber: "CP-DEMO-004", customerId: bi(1004), paymentDate: d("2026-03-11"), amount: 44000, paymentMethod: "bank_transfer", bankAccountId: bi(5), status: "completed", notes: "50% advance on enterprise suite", creatorId: CO, createdBy: CO },
      { id: bi(1005), referenceNumber: "CP-DEMO-005", customerId: bi(3), paymentDate: d("2026-03-16"), amount: 5200, paymentMethod: "online", bankAccountId: bi(7), status: "pending", notes: "Online payment processing", creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── 7. VENDOR PAYMENTS ─────────────────────────────────────────────────────
  console.log("[demo-seed] Vendor Payments…");
  await prisma.vendorPayment.createMany({
    data: [
      { id: bi(1001), referenceNumber: "VP-DEMO-001", vendorId: bi(1), paymentDate: d("2026-01-09"), amount: 5200, paymentMethod: "bank_transfer", bankAccountId: bi(5), status: "completed", notes: "Utility bills Jan", creatorId: CO, createdBy: CO },
      { id: bi(1002), referenceNumber: "VP-DEMO-002", vendorId: bi(2), paymentDate: d("2026-01-16"), amount: 12400, paymentMethod: "bank_transfer", bankAccountId: bi(5), status: "completed", notes: "Rent payment Jan", creatorId: CO, createdBy: CO },
      { id: bi(1003), referenceNumber: "VP-DEMO-003", vendorId: bi(1001), paymentDate: d("2026-02-12"), amount: 8500, paymentMethod: "bank_transfer", bankAccountId: bi(6), status: "completed", notes: "Equipment lease payment", creatorId: CO, createdBy: CO },
      { id: bi(1004), referenceNumber: "VP-DEMO-004", vendorId: bi(4), paymentDate: d("2026-02-27"), amount: 14200, paymentMethod: "online", bankAccountId: bi(7), status: "completed", notes: "Annual SaaS subscriptions", creatorId: CO, createdBy: CO },
      { id: bi(1005), referenceNumber: "VP-DEMO-005", vendorId: bi(1003), paymentDate: d("2026-03-03"), amount: 11000, paymentMethod: "bank_transfer", bankAccountId: bi(5), status: "pending", notes: "Partial server hardware payment", creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── 8. CREDIT NOTES ────────────────────────────────────────────────────────
  console.log("[demo-seed] Credit Notes…");
  await prisma.creditNote.createMany({
    data: [
      { id: bi(1001), referenceNumber: "CN-DEMO-001", customerId: bi(1), date: d("2026-01-20"), amount: 2500, reason: "Product return – partial refund for software licence Q1", status: "approved", creatorId: CO, createdBy: CO },
      { id: bi(1002), referenceNumber: "CN-DEMO-002", customerId: bi(2), date: d("2026-02-08"), amount: 1800, reason: "Service discount adjustment – SLA penalty", status: "approved", creatorId: CO, createdBy: CO },
      { id: bi(1003), referenceNumber: "CN-DEMO-003", customerId: bi(1002), date: d("2026-03-01"), amount: 5000, reason: "Overcharge correction on e-commerce setup", status: "pending", creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── 9. DEBIT NOTES ─────────────────────────────────────────────────────────
  console.log("[demo-seed] Debit Notes…");
  await prisma.debitNote.createMany({
    data: [
      { id: bi(1001), referenceNumber: "DN-DEMO-001", vendorId: bi(1), date: d("2026-01-30"), amount: 750, reason: "Damaged goods returned to supplier", status: "approved", creatorId: CO, createdBy: CO },
      { id: bi(1002), referenceNumber: "DN-DEMO-002", vendorId: bi(3), date: d("2026-02-18"), amount: 1200, reason: "Incorrect billing — overcharged on office supplies", status: "approved", creatorId: CO, createdBy: CO },
      { id: bi(1003), referenceNumber: "DN-DEMO-003", vendorId: bi(1001), date: d("2026-03-08"), amount: 2100, reason: "Equipment warranty claim deduction", status: "pending", creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── 10. BANK TRANSFERS ─────────────────────────────────────────────────────
  console.log("[demo-seed] Bank Transfers…");
  await prisma.bankTransfer.createMany({
    data: [
      { id: bi(1001), fromAccountId: bi(5), toAccountId: bi(7), transferDate: d("2026-01-31"), amount: 25000, referenceNumber: "BT-DEMO-001", description: "Monthly payroll funding transfer", fees: 0, creatorId: CO, createdBy: CO },
      { id: bi(1002), fromAccountId: bi(5), toAccountId: bi(6), transferDate: d("2026-02-28"), amount: 50000, referenceNumber: "BT-DEMO-002", description: "Reserve fund replenishment", fees: 0, creatorId: CO, createdBy: CO },
      { id: bi(1003), fromAccountId: bi(6), toAccountId: bi(5), transferDate: d("2026-03-14"), amount: 15000, referenceNumber: "BT-DEMO-003", description: "Operating expenses funding", fees: 25, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── 11. SALES PROPOSALS ────────────────────────────────────────────────────
  console.log("[demo-seed] Sales Proposals…");
  await prisma.salesProposal.createMany({
    data: [
      { id: bi(1001), proposalNumber: "PROP-DEMO-001", proposalDate: d("2026-01-15"), dueDate: d("2026-02-15"), customerId: bi(1), subtotal: 45000, taxAmount: 4500, discountAmount: 2000, totalAmount: 47500, status: "accepted", convertedToInvoice: false, paymentTerms: "Net 30", notes: "Q1 software suite proposal", creatorId: CO, createdBy: CO },
      { id: bi(1002), proposalNumber: "PROP-DEMO-002", proposalDate: d("2026-02-01"), dueDate: d("2026-03-01"), customerId: bi(1003), subtotal: 78000, taxAmount: 7800, discountAmount: 3000, totalAmount: 82800, status: "sent", convertedToInvoice: false, paymentTerms: "Net 45", notes: "Annual enterprise agreement", creatorId: CO, createdBy: CO },
      { id: bi(1003), proposalNumber: "PROP-DEMO-003", proposalDate: d("2026-03-01"), dueDate: d("2026-04-01"), customerId: bi(1004), subtotal: 32000, taxAmount: 3200, discountAmount: 0, totalAmount: 35200, status: "draft", convertedToInvoice: false, paymentTerms: "Net 30", notes: "Cloud migration project proposal", creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── 12. SALES PROPOSAL ITEMS ───────────────────────────────────────────────
  await prisma.salesProposalItem.createMany({
    data: [
      { id: bi(1001), proposalId: bi(1001), productId: bi(1), quantity: 5, unitPrice: 8000, discountPercentage: 0, discountAmount: 2000, taxPercentage: 10, taxAmount: 4300, totalAmount: 47500 },
      { id: bi(1002), proposalId: bi(1002), productId: bi(1), quantity: 1, unitPrice: 78000, discountPercentage: 4, discountAmount: 3000, taxPercentage: 10, taxAmount: 7800, totalAmount: 82800 },
      { id: bi(1003), proposalId: bi(1003), productId: bi(1), quantity: 4, unitPrice: 8000, discountPercentage: 0, discountAmount: 0, taxPercentage: 10, taxAmount: 3200, totalAmount: 35200 },
    ],
    skipDuplicates: true,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HELPDESK
  // ─────────────────────────────────────────────────────────────────────────
  console.log("[demo-seed] Helpdesk Categories…");
  await prisma.helpdeskCategory.createMany({
    data: [
      { id: bi(1001), name: "Technical Support", description: "Software bugs, crashes, and technical issues", color: "#3B82F6", isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(1002), name: "Billing & Payments", description: "Invoice disputes, payment issues, refund requests", color: "#10B981", isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(1003), name: "Feature Requests", description: "Suggestions for new features and improvements", color: "#8B5CF6", isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(1004), name: "Account & Access", description: "Login issues, password resets, account settings", color: "#F59E0B", isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(1005), name: "General Enquiry", description: "General questions and miscellaneous requests", color: "#6B7280", isActive: true, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] Helpdesk Tickets…");
  await prisma.helpdeskTicket.createMany({
    data: [
      { id: bi(1001), ticketId: "TKT-DEMO-001", title: "Cannot export reports to PDF", description: "When clicking the Export PDF button on the Reports page, nothing happens. Tried on Chrome and Firefox.", status: "open", priority: "high", categoryId: bi(1001), createdBy: CO },
      { id: bi(1002), ticketId: "TKT-DEMO-002", title: "Invoice #INV-204 shows incorrect amount", description: "The total on invoice INV-204 does not match our PO. It shows $12,500 but our PO was for $11,200.", status: "in_progress", priority: "urgent", categoryId: bi(1002), createdBy: CO },
      { id: bi(1003), ticketId: "TKT-DEMO-003", title: "Request: dark mode for dashboard", description: "It would be great to have a dark mode option for the dashboard to reduce eye strain during long working hours.", status: "open", priority: "low", categoryId: bi(1003), createdBy: CO },
      { id: bi(1004), ticketId: "TKT-DEMO-004", title: "Password reset email not received", description: "Tried to reset my password three times. Checked spam folder. No email received.", status: "resolved", priority: "medium", categoryId: bi(1004), createdBy: CO, resolvedAt: d("2026-03-10") },
      { id: bi(1005), ticketId: "TKT-DEMO-005", title: "Slow loading on Projects module", description: "The Projects list takes over 10 seconds to load when there are more than 20 projects. Seems like a performance issue.", status: "in_progress", priority: "high", categoryId: bi(1001), createdBy: CO },
      { id: bi(1006), ticketId: "TKT-DEMO-006", title: "Request: CSV export for employee attendance", description: "Would like the ability to export monthly attendance data as CSV for our payroll system.", status: "open", priority: "medium", categoryId: bi(1003), createdBy: CO },
      { id: bi(1007), ticketId: "TKT-DEMO-007", title: "Bank account balance not updating", description: "After recording a transfer of $25,000, the bank account balance did not update in real time.", status: "resolved", priority: "high", categoryId: bi(1001), createdBy: CO, resolvedAt: d("2026-03-12") },
      { id: bi(1008), ticketId: "TKT-DEMO-008", title: "How to add custom leave types?", description: "We have a company-specific leave called 'Paternity Leave' that is not in the default list. How do I add it?", status: "resolved", priority: "low", categoryId: bi(1005), createdBy: CO, resolvedAt: d("2026-03-14") },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] Helpdesk Replies…");
  await prisma.helpdeskReply.createMany({
    data: [
      { id: bi(1001), ticketId: bi(1001), message: "Thank you for reporting this. We have identified the issue with the PDF renderer. A fix is being tested and will be deployed within 24 hours.", createdBy: CO, isInternal: false },
      { id: bi(1002), ticketId: bi(1002), message: "We have reviewed invoice INV-204. The discrepancy was due to a tax adjustment applied automatically. I will send a corrected invoice shortly.", createdBy: CO, isInternal: false },
      { id: bi(1003), ticketId: bi(1002), message: "Internal note: Check the tax settings for this customer account — they might have been set up incorrectly.", createdBy: CO, isInternal: true },
      { id: bi(1004), ticketId: bi(1004), message: "We have resent the password reset email. Please check your inbox and spam folder. The link expires in 60 minutes.", createdBy: CO, isInternal: false },
      { id: bi(1005), ticketId: bi(1005), message: "We are investigating the performance issue. Initial analysis shows the query is missing an index. We are working on an optimisation.", createdBy: CO, isInternal: false },
      { id: bi(1006), ticketId: bi(1007), message: "This was a display caching issue. We have flushed the cache and the balance now reflects correctly. Please verify.", createdBy: CO, isInternal: false },
      { id: bi(1007), ticketId: bi(1008), message: "You can add custom leave types in HRM → Leave Types. Click 'Add Leave Type', enter 'Paternity Leave', set the days allowed, and save. Let us know if you need further assistance.", createdBy: CO, isInternal: false },
    ],
    skipDuplicates: true,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TASKLY (Projects)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("[demo-seed] Additional Projects…");
  await prisma.project.createMany({
    data: [
      { id: bi(1001), name: "PaperFlight Website Redesign", description: "Full redesign of the marketing website including new landing pages, blog, and case studies.", budget: 35000, startDate: d("2026-01-15"), endDate: d("2026-04-30"), status: "Ongoing", creatorId: CO, createdBy: CO },
      { id: bi(1002), name: "HR Automation System", description: "Automate payroll, leave management, and attendance tracking integrated with HRM module.", budget: 52000, startDate: d("2026-02-01"), endDate: d("2026-06-30"), status: "Ongoing", creatorId: CO, createdBy: CO },
      { id: bi(1003), name: "Data Analytics Dashboard", description: "Real-time business intelligence dashboard pulling data from all modules.", budget: 28000, startDate: d("2026-03-01"), endDate: d("2026-05-31"), status: "Not Started", creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] Project Milestones…");
  await prisma.projectMilestone.createMany({
    data: [
      { id: bi(1001), projectId: bi(1001), title: "Design Mockups Approved", cost: 8000, startDate: d("2026-01-15"), endDate: d("2026-02-15"), summary: "Complete all wireframes and visual mockups for approval", status: "complete", progress: 100 },
      { id: bi(1002), projectId: bi(1001), title: "Frontend Development", cost: 15000, startDate: d("2026-02-16"), endDate: d("2026-03-31"), summary: "Build responsive frontend with all pages", status: "ongoing", progress: 65 },
      { id: bi(1003), projectId: bi(1002), title: "Payroll Engine Integration", cost: 20000, startDate: d("2026-02-01"), endDate: d("2026-04-15"), summary: "Integrate payroll calculations with HRM salary module", status: "ongoing", progress: 40 },
      { id: bi(1004), projectId: bi(1002), title: "Leave & Attendance Automation", cost: 18000, startDate: d("2026-04-16"), endDate: d("2026-06-30"), summary: "Automated leave approval workflows and attendance sync", status: "not_started", progress: 0 },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] Task Stages…");
  await prisma.taskStage.createMany({
    data: [
      { id: bi(1), name: "To Do",       color: "#6b7280", complete: false, order: 1, creatorId: CO, createdBy: CO },
      { id: bi(2), name: "In Progress", color: "#3b82f6", complete: false, order: 2, creatorId: CO, createdBy: CO },
      { id: bi(3), name: "In Review",   color: "#f59e0b", complete: false, order: 3, creatorId: CO, createdBy: CO },
      { id: bi(4), name: "Done",        color: "#10b981", complete: true,  order: 4, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] Bug Stages…");
  await prisma.bugStage.createMany({
    data: [
      { id: bi(1), name: "Open",        color: "#ef4444", complete: false, order: 1, creatorId: CO, createdBy: CO },
      { id: bi(2), name: "In Progress", color: "#3b82f6", complete: false, order: 2, creatorId: CO, createdBy: CO },
      { id: bi(3), name: "Testing",     color: "#f59e0b", complete: false, order: 3, creatorId: CO, createdBy: CO },
      { id: bi(4), name: "Resolved",    color: "#10b981", complete: true,  order: 4, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] Project Tasks…");
  await prisma.projectTask.createMany({
    data: [
      { id: bi(1001), projectId: bi(1001), title: "Create homepage wireframes", priority: "high", stageId: bi(4), description: "Design wireframes for the new homepage hero section and feature blocks", assignedTo: ["1001", "1012"], creatorId: CO, createdBy: CO },
      { id: bi(1002), projectId: bi(1001), title: "Build navigation component", priority: "medium", stageId: bi(3), description: "Responsive navigation with mobile hamburger menu", assignedTo: ["1012"], creatorId: CO, createdBy: CO },
      { id: bi(1003), projectId: bi(1001), title: "Implement blog listing page", priority: "medium", stageId: bi(3), description: "Blog index with pagination, tags, and search", assignedTo: ["1001", "1013"], creatorId: CO, createdBy: CO },
      { id: bi(1004), projectId: bi(1001), title: "SEO meta tags implementation", priority: "low", stageId: bi(2), description: "Add dynamic meta tags, OG images, and structured data", assignedTo: ["1013"], creatorId: CO, createdBy: CO },
      { id: bi(1005), projectId: bi(1002), title: "Design payroll calculation engine", priority: "urgent", stageId: bi(3), description: "Gross to net salary computation including tax brackets", assignedTo: ["1010", "1011"], creatorId: CO, createdBy: CO },
      { id: bi(1006), projectId: bi(1002), title: "Build leave approval workflow", priority: "high", stageId: bi(2), description: "Multi-level approval for leave applications with email notifications", assignedTo: ["1010"], creatorId: CO, createdBy: CO },
      { id: bi(1007), projectId: bi(1002), title: "Attendance sync with biometric", priority: "high", stageId: bi(1), description: "API integration with biometric attendance devices", assignedTo: ["1011", "1013"], creatorId: CO, createdBy: CO },
      { id: bi(1008), projectId: bi(1003), title: "Define KPI metrics and data sources", priority: "high", stageId: bi(2), description: "Work with stakeholders to define the key metrics for the analytics board", assignedTo: ["1001", "1010"], creatorId: CO, createdBy: CO },
      { id: bi(1009), projectId: bi(1003), title: "Design dashboard layout", priority: "medium", stageId: bi(2), description: "Chart types, widget layout, and color scheme for the BI dashboard", assignedTo: ["1012", "1011"], creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] Project Bugs…");
  await prisma.projectBug.createMany({
    data: [
      { id: bi(1001), projectId: bi(1001), title: "Mobile menu does not close on link click", priority: "medium", stageId: bi(3), description: "On mobile, clicking a nav link does not close the hamburger menu. User must manually close it.", assignedTo: [], creatorId: CO, createdBy: CO },
      { id: bi(1002), projectId: bi(1001), title: "Hero image does not load on Safari", priority: "high", stageId: bi(2), description: "The WebP hero image fails on Safari < 14. Need a JPEG fallback.", assignedTo: [], creatorId: CO, createdBy: CO },
      { id: bi(1003), projectId: bi(1002), title: "Overtime calculation is incorrect for night shifts", priority: "urgent", stageId: bi(3), description: "Night shift overtime (midnight crossover) calculates wrong hours. Needs timezone-aware calculation.", assignedTo: [], creatorId: CO, createdBy: CO },
      { id: bi(1004), projectId: bi(1002), title: "Leave balance does not deduct on approval", priority: "high", stageId: bi(1), description: "When a leave application is approved, the employee's leave balance does not automatically reduce.", assignedTo: [], creatorId: CO, createdBy: CO },
      { id: bi(1005), projectId: bi(1003), title: "Chart tooltip overlaps with legend on small screens", priority: "low", stageId: bi(2), description: "On screens < 768px, the chart tooltip and the legend text overlap, making the chart unreadable.", assignedTo: [], creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HRM
  // ─────────────────────────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Branches…");
  await prisma.hrmBranch.createMany({
    data: [
      { id: bi(1), name: "Chicago Office",  address: "500 Michigan Ave, Chicago, IL 60611", city: "Chicago",  country: "USA", phone: "+1-312-555-0001", email: "chicago@paperflight.demo",  isActive: true, createdBy: CO },
      { id: bi(2), name: "New York Office", address: "100 Wall St, New York, NY 10005",      city: "New York", country: "USA", phone: "+1-212-555-0001", email: "newyork@paperflight.demo", isActive: true, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] HRM Departments…");
  await prisma.hrmDepartment.createMany({
    data: [
      { id: bi(1001), name: "Engineering", description: "Software development and infrastructure", branchId: bi(2), isActive: true, createdBy: CO },
      { id: bi(1002), name: "Human Resources", description: "Recruitment, payroll, and employee welfare", branchId: bi(2), isActive: true, createdBy: CO },
      { id: bi(1003), name: "Sales & Marketing", description: "Revenue generation and brand management", branchId: bi(1), isActive: true, createdBy: CO },
      { id: bi(1004), name: "Finance & Accounting", description: "Financial planning, reporting, and compliance", branchId: bi(2), isActive: true, createdBy: CO },
      { id: bi(1005), name: "Customer Success", description: "Onboarding, support, and retention", branchId: bi(1), isActive: true, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] HRM Designations…");
  await prisma.hrmDesignation.createMany({
    data: [
      { id: bi(1001), name: "Senior Software Engineer", description: "Leads technical design and development", departmentId: bi(1001), isActive: true, createdBy: CO },
      { id: bi(1002), name: "Frontend Developer", description: "Builds UI components and user experiences", departmentId: bi(1001), isActive: true, createdBy: CO },
      { id: bi(1003), name: "HR Manager", description: "Oversees HR operations and compliance", departmentId: bi(1002), isActive: true, createdBy: CO },
      { id: bi(1004), name: "HR Executive", description: "Handles day-to-day HR activities", departmentId: bi(1002), isActive: true, createdBy: CO },
      { id: bi(1005), name: "Sales Manager", description: "Manages sales team and pipeline", departmentId: bi(1003), isActive: true, createdBy: CO },
      { id: bi(1006), name: "Business Development Executive", description: "Prospects and closes new business deals", departmentId: bi(1003), isActive: true, createdBy: CO },
      { id: bi(1007), name: "Finance Manager", description: "Financial planning and budgeting", departmentId: bi(1004), isActive: true, createdBy: CO },
      { id: bi(1008), name: "Customer Success Manager", description: "Manages key client relationships", departmentId: bi(1005), isActive: true, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] HRM Shifts…");
  await prisma.hrmShift.createMany({
    data: [
      { id: bi(1001), name: "Morning Shift", startTime: "08:00", endTime: "16:00", breakMinutes: 60, isActive: true, createdBy: CO },
      { id: bi(1002), name: "Standard Office Hours", startTime: "09:00", endTime: "17:30", breakMinutes: 30, isActive: true, createdBy: CO },
      { id: bi(1003), name: "Evening Shift", startTime: "14:00", endTime: "22:00", breakMinutes: 60, isActive: true, createdBy: CO },
      { id: bi(1004), name: "Flexible Hours", startTime: "10:00", endTime: "18:30", breakMinutes: 30, isActive: true, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] HRM Leave Types…");
  await prisma.hrmLeaveType.createMany({
    data: [
      { id: bi(1001), name: "Annual Leave", leaveCode: "AL", daysAllowed: 21, isActive: true, createdBy: CO },
      { id: bi(1002), name: "Sick Leave", leaveCode: "SL", daysAllowed: 14, isActive: true, createdBy: CO },
      { id: bi(1003), name: "Maternity Leave", leaveCode: "ML", daysAllowed: 90, isActive: true, createdBy: CO },
      { id: bi(1004), name: "Paternity Leave", leaveCode: "PL", daysAllowed: 10, isActive: true, createdBy: CO },
      { id: bi(1005), name: "Unpaid Leave", leaveCode: "UL", daysAllowed: 30, isActive: true, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] HRM Holidays…");
  await prisma.hrmHoliday.createMany({
    data: [
      { id: bi(1001), name: "New Year's Day", date: d("2026-01-01"), description: "New Year public holiday", isActive: true, createdBy: CO },
      { id: bi(1002), name: "Martin Luther King Jr. Day", date: d("2026-01-19"), description: "Federal public holiday", isActive: true, createdBy: CO },
      { id: bi(1003), name: "Presidents' Day", date: d("2026-02-16"), description: "Federal public holiday", isActive: true, createdBy: CO },
      { id: bi(1004), name: "Memorial Day", date: d("2026-05-25"), description: "Federal public holiday", isActive: true, createdBy: CO },
      { id: bi(1005), name: "Independence Day", date: d("2026-07-04"), description: "US Independence Day", isActive: true, createdBy: CO },
      { id: bi(1006), name: "Labor Day", date: d("2026-09-07"), description: "Federal public holiday", isActive: true, createdBy: CO },
      { id: bi(1007), name: "Thanksgiving Day", date: d("2026-11-26"), description: "Federal public holiday", isActive: true, createdBy: CO },
      { id: bi(1008), name: "Christmas Day", date: d("2026-12-25"), description: "Christmas public holiday", isActive: true, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] HRM Award Types…");
  await prisma.hrmAwardType.createMany({
    data: [
      { id: bi(1001), name: "Employee of the Month", description: "Recognises outstanding performance in a calendar month", createdBy: CO },
      { id: bi(1002), name: "Innovation Award", description: "Celebrates creative problem-solving and new ideas", createdBy: CO },
      { id: bi(1003), name: "Customer Champion", description: "Awarded for exceptional client satisfaction scores", createdBy: CO },
      { id: bi(1004), name: "Team Player Award", description: "Recognises outstanding collaboration and team spirit", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Employees ─────────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Employees…");
  const employees = [
    { id: bi(1001), employeeId: "EMP-1001", firstName: "Samantha", lastName: "Clarke", email: "s.clarke@paperflight.demo", phone: "+1-212-555-1001", gender: "female", dateOfBirth: d("1990-03-12"), address: "42 Park Ave", city: "New York", country: "USA", departmentId: bi(1001), designationId: bi(1001), branchId: bi(2), shiftId: bi(1002), status: "active", employeeType: "permanent", workType: "onsite", joiningDate: d("2022-04-01"), basicSalary: 8500, bankName: "First National Bank", bankAccountNumber: "100200300", emergencyName: "David Clarke", emergencyPhone: "+1-212-555-9001", createdBy: CO },
    { id: bi(1002), employeeId: "EMP-1002", firstName: "Marcus", lastName: "Rivera", email: "m.rivera@paperflight.demo", phone: "+1-212-555-1002", gender: "male", dateOfBirth: d("1988-07-24"), address: "18 Broadway", city: "New York", country: "USA", departmentId: bi(1001), designationId: bi(1002), branchId: bi(2), shiftId: bi(1002), status: "active", employeeType: "permanent", workType: "hybrid", joiningDate: d("2021-09-15"), basicSalary: 6800, bankName: "City Savings Bank", bankAccountNumber: "200300400", emergencyName: "Rosa Rivera", emergencyPhone: "+1-212-555-9002", createdBy: CO },
    { id: bi(1003), employeeId: "EMP-1003", firstName: "Aisha", lastName: "Patel", email: "a.patel@paperflight.demo", phone: "+1-312-555-1003", gender: "female", dateOfBirth: d("1993-11-08"), address: "500 Michigan Ave", city: "Chicago", country: "USA", departmentId: bi(1002), designationId: bi(1003), branchId: bi(1), shiftId: bi(1002), status: "active", employeeType: "permanent", workType: "onsite", joiningDate: d("2020-06-01"), basicSalary: 7200, bankName: "Metro Business Bank", bankAccountNumber: "300400500", emergencyName: "Raj Patel", emergencyPhone: "+1-312-555-9003", createdBy: CO },
    { id: bi(1004), employeeId: "EMP-1004", firstName: "Tyler", lastName: "Johnson", email: "t.johnson@paperflight.demo", phone: "+1-312-555-1004", gender: "male", dateOfBirth: d("1995-05-17"), address: "220 Wacker Dr", city: "Chicago", country: "USA", departmentId: bi(1002), designationId: bi(1004), branchId: bi(1), shiftId: bi(1001), status: "active", employeeType: "permanent", workType: "onsite", joiningDate: d("2023-01-10"), basicSalary: 4500, bankName: "First National Bank", bankAccountNumber: "400500600", emergencyName: "Linda Johnson", emergencyPhone: "+1-312-555-9004", createdBy: CO },
    { id: bi(1005), employeeId: "EMP-1005", firstName: "Charlotte", lastName: "Wong", email: "c.wong@paperflight.demo", phone: "+1-212-555-1005", gender: "female", dateOfBirth: d("1987-09-30"), address: "77 Water St", city: "New York", country: "USA", departmentId: bi(1003), designationId: bi(1005), branchId: bi(2), shiftId: bi(1002), status: "active", employeeType: "permanent", workType: "onsite", joiningDate: d("2019-08-01"), basicSalary: 9200, bankName: "City Savings Bank", bankAccountNumber: "500600700", emergencyName: "Kevin Wong", emergencyPhone: "+1-212-555-9005", createdBy: CO },
    { id: bi(1006), employeeId: "EMP-1006", firstName: "Daniel", lastName: "Kim", email: "d.kim@paperflight.demo", phone: "+1-312-555-1006", gender: "male", dateOfBirth: d("1992-02-14"), address: "350 North Clark St", city: "Chicago", country: "USA", departmentId: bi(1003), designationId: bi(1006), branchId: bi(1), shiftId: bi(1004), status: "active", employeeType: "contract", workType: "remote", joiningDate: d("2024-01-15"), basicSalary: 5500, bankName: "Metro Business Bank", bankAccountNumber: "600700800", emergencyName: "Sun Kim", emergencyPhone: "+1-312-555-9006", createdBy: CO },
    { id: bi(1007), employeeId: "EMP-1007", firstName: "Natasha", lastName: "Müller", email: "n.muller@paperflight.demo", phone: "+1-212-555-1007", gender: "female", dateOfBirth: d("1985-12-03"), address: "100 Wall St", city: "New York", country: "USA", departmentId: bi(1004), designationId: bi(1007), branchId: bi(2), shiftId: bi(1002), status: "active", employeeType: "permanent", workType: "onsite", joiningDate: d("2018-03-01"), basicSalary: 10500, bankName: "First National Bank", bankAccountNumber: "700800900", emergencyName: "Hans Müller", emergencyPhone: "+1-212-555-9007", createdBy: CO },
    { id: bi(1008), employeeId: "EMP-1008", firstName: "Omar", lastName: "Hassan", email: "o.hassan@paperflight.demo", phone: "+1-212-555-1008", gender: "male", dateOfBirth: d("1991-06-22"), address: "55 Water St", city: "New York", country: "USA", departmentId: bi(1005), designationId: bi(1008), branchId: bi(2), shiftId: bi(1002), status: "active", employeeType: "permanent", workType: "hybrid", joiningDate: d("2022-07-01"), basicSalary: 7800, bankName: "City Savings Bank", bankAccountNumber: "800900100", emergencyName: "Fatima Hassan", emergencyPhone: "+1-212-555-9008", createdBy: CO },
    { id: bi(1009), employeeId: "EMP-1009", firstName: "Grace", lastName: "Thompson", email: "g.thompson@paperflight.demo", phone: "+1-312-555-1009", gender: "female", dateOfBirth: d("1996-04-10"), address: "1000 Lake Shore Dr", city: "Chicago", country: "USA", departmentId: bi(1001), designationId: bi(1002), branchId: bi(1), shiftId: bi(1001), status: "active", employeeType: "intern", workType: "onsite", joiningDate: d("2025-09-01"), basicSalary: 2800, bankName: "Metro Business Bank", bankAccountNumber: "900100200", emergencyName: "Paul Thompson", emergencyPhone: "+1-312-555-9009", createdBy: CO },
    { id: bi(1010), employeeId: "EMP-1010", firstName: "Ethan", lastName: "Brooks", email: "e.brooks@paperflight.demo", phone: "+1-212-555-1010", gender: "male", dateOfBirth: d("1989-08-18"), address: "30 Rockefeller Plaza", city: "New York", country: "USA", departmentId: bi(1005), designationId: bi(1008), branchId: bi(2), shiftId: bi(1004), status: "inactive", employeeType: "permanent", workType: "remote", joiningDate: d("2021-02-01"), leavingDate: d("2025-12-31"), basicSalary: 6500, bankName: "First National Bank", bankAccountNumber: "101010101", emergencyName: "Ann Brooks", emergencyPhone: "+1-212-555-9010", createdBy: CO },
  ];
  await prisma.hrmEmployee.createMany({ data: employees, skipDuplicates: true });

  // ── HRM Salary Allocations ────────────────────────────────────────────────
  console.log("[demo-seed] HRM Salary Allocations…");
  await prisma.hrmSalaryAllocation.createMany({
    data: [
      { id: bi(1001), employeeId: bi(1001), basicSalary: 8500, allowances: { housing: 1200, transport: 400, meal: 200 }, deductions: { tax: 850, pension: 425 }, netSalary: 9025, effectiveDate: d("2026-01-01"), createdBy: CO },
      { id: bi(1002), employeeId: bi(1002), basicSalary: 6800, allowances: { housing: 900, transport: 300, meal: 150 }, deductions: { tax: 680, pension: 340 }, netSalary: 7130, effectiveDate: d("2026-01-01"), createdBy: CO },
      { id: bi(1003), employeeId: bi(1003), basicSalary: 7200, allowances: { housing: 1000, transport: 350, meal: 180 }, deductions: { tax: 720, pension: 360 }, netSalary: 7650, effectiveDate: d("2026-01-01"), createdBy: CO },
      { id: bi(1004), employeeId: bi(1005), basicSalary: 9200, allowances: { housing: 1400, transport: 450, meal: 250, performance: 500 }, deductions: { tax: 920, pension: 460 }, netSalary: 10420, effectiveDate: d("2026-01-01"), createdBy: CO },
      { id: bi(1005), employeeId: bi(1007), basicSalary: 10500, allowances: { housing: 1800, transport: 500, meal: 300, executive: 1000 }, deductions: { tax: 1050, pension: 525 }, netSalary: 12525, effectiveDate: d("2026-01-01"), createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Payrolls ──────────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Payrolls…");
  await prisma.hrmPayroll.createMany({
    data: [
      { id: bi(1001), employeeId: bi(1001), month: 1, year: 2026, basicSalary: 8500, allowances: 1800, overtime: 425, bonus: 0, deductions: 1275, tax: 850, netSalary: 8600, status: "paid", paymentDate: d("2026-01-31"), paymentMethod: "bank_transfer", notes: "January 2026 payroll", createdBy: CO },
      { id: bi(1002), employeeId: bi(1002), month: 1, year: 2026, basicSalary: 6800, allowances: 1350, overtime: 0, bonus: 500, deductions: 1020, tax: 680, netSalary: 6950, status: "paid", paymentDate: d("2026-01-31"), paymentMethod: "bank_transfer", notes: "January 2026 payroll + year-end bonus", createdBy: CO },
      { id: bi(1003), employeeId: bi(1005), month: 1, year: 2026, basicSalary: 9200, allowances: 2600, overtime: 0, bonus: 1000, deductions: 1380, tax: 920, netSalary: 10500, status: "paid", paymentDate: d("2026-01-31"), paymentMethod: "bank_transfer", notes: "January 2026 payroll + performance bonus", createdBy: CO },
      { id: bi(1004), employeeId: bi(1001), month: 2, year: 2026, basicSalary: 8500, allowances: 1800, overtime: 850, bonus: 0, deductions: 1275, tax: 850, netSalary: 9025, status: "paid", paymentDate: d("2026-02-28"), paymentMethod: "bank_transfer", notes: "February 2026 payroll with overtime", createdBy: CO },
      { id: bi(1005), employeeId: bi(1007), month: 1, year: 2026, basicSalary: 10500, allowances: 3600, overtime: 0, bonus: 2000, deductions: 1575, tax: 1050, netSalary: 13475, status: "paid", paymentDate: d("2026-01-31"), paymentMethod: "bank_transfer", notes: "January 2026 payroll + Q4 bonus", createdBy: CO },
      { id: bi(1006), employeeId: bi(1002), month: 2, year: 2026, basicSalary: 6800, allowances: 1350, overtime: 340, bonus: 0, deductions: 1020, tax: 680, netSalary: 6790, status: "paid", paymentDate: d("2026-02-28"), paymentMethod: "bank_transfer", notes: "February 2026", createdBy: CO },
      { id: bi(1007), employeeId: bi(1003), month: 2, year: 2026, basicSalary: 7200, allowances: 1530, overtime: 0, bonus: 0, deductions: 1080, tax: 720, netSalary: 6930, status: "processing", paymentDate: d("2026-02-28"), paymentMethod: "bank_transfer", notes: "February 2026", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Attendances ───────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Attendances…");
  const attendanceDates = ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13", "2026-03-16", "2026-03-17"];
  const attData = [];
  let attId = 1001;
  const attEmps = [bi(1001), bi(1002), bi(1003), bi(1005), bi(1007), bi(1008)];
  for (const empId of attEmps) {
    for (const dt of attendanceDates) {
      const isPresent = Math.random() > 0.1;
      attData.push({
        id: bi(attId++),
        employeeId: empId,
        date: d(dt),
        clockIn: isPresent ? "09:02" : null,
        clockOut: isPresent ? "17:35" : null,
        workHours: isPresent ? 8.5 : 0,
        status: isPresent ? "present" : "absent",
        note: isPresent ? null : "No clock-in recorded",
        createdBy: CO,
      });
    }
  }
  await prisma.hrmAttendance.createMany({ data: attData, skipDuplicates: true });

  // ── HRM Leave Applications ────────────────────────────────────────────────
  console.log("[demo-seed] HRM Leave Applications…");
  await prisma.hrmLeaveApplication.createMany({
    data: [
      { id: bi(1001), employeeId: bi(1001), leaveTypeId: bi(1001), startDate: d("2026-02-17"), endDate: d("2026-02-21"), totalDays: 5, reason: "Family vacation – pre-planned leave", status: "approved", approvedById: CO, approvedAt: d("2026-02-10"), createdBy: CO },
      { id: bi(1002), employeeId: bi(1002), leaveTypeId: bi(1002), startDate: d("2026-03-03"), endDate: d("2026-03-04"), totalDays: 2, reason: "Flu – doctor's note provided", status: "approved", approvedById: CO, approvedAt: d("2026-03-03"), createdBy: CO },
      { id: bi(1003), employeeId: bi(1005), leaveTypeId: bi(1001), startDate: d("2026-04-07"), endDate: d("2026-04-11"), totalDays: 5, reason: "Annual holiday to Europe", status: "pending", createdBy: CO },
      { id: bi(1004), employeeId: bi(1008), leaveTypeId: bi(1004), startDate: d("2026-05-01"), endDate: d("2026-05-10"), totalDays: 10, reason: "Paternity leave – new baby", status: "approved", approvedById: CO, approvedAt: d("2026-04-20"), createdBy: CO },
      { id: bi(1005), employeeId: bi(1003), leaveTypeId: bi(1002), startDate: d("2026-03-18"), endDate: d("2026-03-18"), totalDays: 1, reason: "Medical appointment", status: "pending", createdBy: CO },
      { id: bi(1006), employeeId: bi(1007), leaveTypeId: bi(1001), startDate: d("2026-03-23"), endDate: d("2026-03-27"), totalDays: 5, reason: "Personal travel – annual leave", status: "approved", approvedById: CO, approvedAt: d("2026-03-10"), createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Awards ────────────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Awards…");
  await prisma.hrmAward.createMany({
    data: [
      { id: bi(1001), employeeId: bi(1001), awardTypeId: bi(1001), awardName: "Employee of the Month – January 2026", date: d("2026-01-31"), gift: "Amazon Gift Card", cashPrice: 200, description: "Outstanding delivery of the authentication module ahead of schedule.", createdBy: CO },
      { id: bi(1002), employeeId: bi(1005), awardTypeId: bi(1002), awardName: "Innovation Award Q1 2026", date: d("2026-03-31"), gift: "Trophy", cashPrice: 500, description: "Introduced the automated lead scoring system that increased conversion by 18%.", createdBy: CO },
      { id: bi(1003), employeeId: bi(1008), awardTypeId: bi(1003), awardName: "Customer Champion – February 2026", date: d("2026-02-28"), gift: "Restaurant Voucher", cashPrice: 150, description: "Received a 9.8/10 CSAT score across all handled tickets in February.", createdBy: CO },
      { id: bi(1004), employeeId: bi(1002), awardTypeId: bi(1004), awardName: "Team Player Award – Q1", date: d("2026-03-31"), gift: "Team Outing Voucher", cashPrice: 100, description: "Consistently helped junior team members and ensured sprint goals were met.", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Promotions ────────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Promotions…");
  await prisma.hrmPromotion.createMany({
    data: [
      { id: bi(1001), employeeId: bi(1002), fromDesignationId: bi(1002), toDesignationId: bi(1001), date: d("2026-01-01"), description: "Promoted based on exceptional code quality and team leadership skills.", createdBy: CO },
      { id: bi(1002), employeeId: bi(1004), fromDesignationId: bi(1004), toDesignationId: bi(1003), date: d("2026-03-01"), description: "Promoted after successfully managing the Q4 recruitment drive independently.", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Warnings ──────────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Warnings…");
  await prisma.hrmWarning.createMany({
    data: [
      { id: bi(1001), employeeId: bi(1009), subject: "Late Arrival – First Warning", warningDate: d("2026-02-10"), description: "Employee has been late by more than 30 minutes on 5 occasions in January. This constitutes a first formal warning under the attendance policy.", createdBy: CO },
      { id: bi(1002), employeeId: bi(1006), subject: "Code of Conduct Violation", warningDate: d("2026-03-05"), description: "Inappropriate communication in team Slack channels. Employee has been counselled and this written warning is being issued as per policy.", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Complaints ────────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Complaints…");
  await prisma.hrmComplaint.createMany({
    data: [
      { id: bi(1001), complainantId: bi(1004), againstId: bi(1006), subject: "Workplace Harassment Complaint", description: "Employee EMP-1004 has raised a formal complaint regarding repeated dismissive comments made by EMP-1006 during team meetings.", date: d("2026-02-20"), status: "investigating", createdBy: CO },
      { id: bi(1002), complainantId: bi(1009), againstId: bi(1001), subject: "Unfair Task Distribution", description: "Intern (EMP-1009) reports that tasks assigned are beyond the scope of the internship agreement and no mentoring support is provided.", date: d("2026-03-08"), status: "pending", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Resignations ──────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Resignations…");
  await prisma.hrmResignation.createMany({
    data: [
      { id: bi(1001), employeeId: bi(1010), noticeDate: d("2025-12-01"), resignationDate: d("2025-12-31"), reason: "Accepted a position at another company closer to home. Grateful for the opportunities provided.", status: "approved", createdBy: CO },
      { id: bi(1002), employeeId: bi(1006), noticeDate: d("2026-04-01"), resignationDate: d("2026-04-30"), reason: "Pursuing further education — enrolled in a full-time MBA programme.", status: "pending", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Terminations ──────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Terminations…");
  await prisma.hrmTermination.createMany({
    data: [
      { id: bi(1001), employeeId: bi(1010), terminationType: "voluntary", noticeDate: d("2025-12-01"), terminationDate: d("2025-12-31"), reason: "Employee resigned voluntarily. Termination processed after notice period.", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Transfers ─────────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Transfers…");
  await prisma.hrmTransfer.createMany({
    data: [
      { id: bi(1001), employeeId: bi(1006), fromDepartmentId: bi(1003), toDepartmentId: bi(1005), fromBranchId: bi(1), toBranchId: bi(2), transferDate: d("2026-04-01"), description: "Transferred to Customer Success to leverage sales experience for client retention initiatives.", createdBy: CO },
      { id: bi(1002), employeeId: bi(1009), fromDepartmentId: bi(1001), toDepartmentId: bi(1003), fromBranchId: bi(1), toBranchId: bi(1), transferDate: d("2026-04-15"), description: "Intern transferred to Sales & Marketing based on interest and aptitude demonstrated during Q1.", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── HRM Documents ─────────────────────────────────────────────────────────
  console.log("[demo-seed] HRM Documents…");
  await prisma.hrmDocument.createMany({
    data: [
      { id: bi(1001), employeeId: bi(1001), documentType: "contract", title: "Employment Contract – Samantha Clarke", description: "Original signed employment contract", filePath: "/documents/emp-1001-contract.pdf", createdBy: CO },
      { id: bi(1002), employeeId: bi(1001), documentType: "id", title: "National ID – Samantha Clarke", description: "Government issued identification", filePath: "/documents/emp-1001-id.pdf", expiryDate: d("2030-03-12"), createdBy: CO },
      { id: bi(1003), employeeId: bi(1007), documentType: "contract", title: "Employment Contract – Natasha Müller", description: "Original signed employment contract", filePath: "/documents/emp-1007-contract.pdf", createdBy: CO },
      { id: bi(1004), employeeId: bi(1005), documentType: "certification", title: "AWS Solutions Architect Certificate", description: "AWS Certified Solutions Architect – Professional", filePath: "/documents/emp-1005-aws-cert.pdf", expiryDate: d("2027-06-01"), createdBy: CO },
      { id: bi(1005), employeeId: bi(1008), documentType: "visa", title: "Work Visa – Omar Hassan", description: "H-1B work authorisation document", filePath: "/documents/emp-1008-visa.pdf", expiryDate: d("2027-09-30"), createdBy: CO },
      { id: bi(1006), employeeId: bi(1003), documentType: "certification", title: "CIPD Level 5 Certificate", description: "HR professional certification", filePath: "/documents/emp-1003-cipd.pdf", expiryDate: d("2028-01-01"), createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // APPOINTMENT ADD-ON DEMO DATA
  // ─────────────────────────────────────────────────────────────────────────

  // ── Appointment Hours (Business Hours) ────────────────────────────────────
  console.log("[demo-seed] Appointment Hours…");
  const BDAYS = [
    { dayName: "Monday",    start: "09:00", end: "17:00", off: false },
    { dayName: "Tuesday",   start: "09:00", end: "17:00", off: false },
    { dayName: "Wednesday", start: "09:00", end: "17:00", off: false },
    { dayName: "Thursday",  start: "09:00", end: "17:00", off: false },
    { dayName: "Friday",    start: "09:00", end: "16:00", off: false },
    { dayName: "Saturday",  start: null,    end: null,    off: true  },
    { dayName: "Sunday",    start: null,    end: null,    off: true  },
  ];
  for (let i = 0; i < BDAYS.length; i++) {
    const bd = BDAYS[i];
    const existing = await prisma.appointmentHour.findFirst({ where: { dayName: bd.dayName, createdBy: CO } });
    if (!existing) {
      await prisma.appointmentHour.create({ data: { id: bi(1001 + i), dayName: bd.dayName, startTime: bd.start, endTime: bd.end, dayOff: bd.off, creatorId: CO, createdBy: CO } });
    }
  }

  // ── Appointment Settings ──────────────────────────────────────────────────
  console.log("[demo-seed] Appointment Settings…");
  const SETTINGS = [
    { key: "company_name",          value: "PaperFlight Clinic" },
    { key: "booking_url",           value: "paperflight" },
    { key: "reminder_hours",        value: "24" },
    { key: "max_bookings_per_day",  value: "20" },
  ];
  for (const s of SETTINGS) {
    const ex = await prisma.appointmentSetting.findFirst({ where: { key: s.key, createdBy: CO } });
    if (!ex) await prisma.appointmentSetting.create({ data: { key: s.key, value: s.value, createdBy: CO } });
  }

  // ── Questions ─────────────────────────────────────────────────────────────
  console.log("[demo-seed] Appointment Questions…");
  await prisma.question.createMany({
    data: [
      { id: bi(1001), questionName: "What is your main concern?", questionType: "textarea", availableAnswers: "", requiredAnswer: true,  enabled: true, creatorId: CO, createdBy: CO },
      { id: bi(1002), questionName: "Do you have any allergies?", questionType: "radio",    availableAnswers: "Yes\nNo",                requiredAnswer: true,  enabled: true, creatorId: CO, createdBy: CO },
      { id: bi(1003), questionName: "How did you hear about us?", questionType: "select",   availableAnswers: "Google\nReferral\nSocial Media\nOther", requiredAnswer: false, enabled: true, creatorId: CO, createdBy: CO },
      { id: bi(1004), questionName: "Preferred contact method",   questionType: "radio",    availableAnswers: "Email\nPhone\nSMS",       requiredAnswer: false, enabled: true, creatorId: CO, createdBy: CO },
      { id: bi(1005), questionName: "Any special requirements?",  questionType: "text",     availableAnswers: "",                       requiredAnswer: false, enabled: true, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Appointments (types) ──────────────────────────────────────────────────
  console.log("[demo-seed] Appointments…");
  await prisma.appointment.createMany({
    data: [
      { id: bi(1001), appointmentName: "Initial Consultation",  appointmentType: "one_to_one", weekDay: JSON.stringify(["Monday","Tuesday","Wednesday","Thursday","Friday"]), duration: 60,  phoneEnabled: true,  questionIds: JSON.stringify([1001, 1002, 1003]), enabled: true,  creatorId: CO, createdBy: CO },
      { id: bi(1002), appointmentName: "Follow-Up Session",     appointmentType: "one_to_one", weekDay: JSON.stringify(["Monday","Wednesday","Friday"]),                     duration: 30,  phoneEnabled: false, questionIds: JSON.stringify([1001, 1005]),       enabled: true,  creatorId: CO, createdBy: CO },
      { id: bi(1003), appointmentName: "Group Workshop",        appointmentType: "group",      weekDay: JSON.stringify(["Saturday"]),                                        duration: 120, phoneEnabled: false, questionIds: JSON.stringify([1003, 1004]),       enabled: false, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Schedules ─────────────────────────────────────────────────────────────
  console.log("[demo-seed] Schedules…");
  await prisma.schedule.createMany({
    data: [
      { id: bi(1001), uniqueId: "SCH-0001", name: "Alice Johnson",   email: "alice@demo.test",   phone: "+1-415-555-0101", date: d("2026-03-20"), startTime: "09:00", endTime: "10:00", appointmentId: bi(1001), status: "approved",   creatorId: CO, createdBy: CO },
      { id: bi(1002), uniqueId: "SCH-0002", name: "Bob Williams",    email: "bob@demo.test",     phone: "+1-312-555-0202", date: d("2026-03-21"), startTime: "10:00", endTime: "10:30", appointmentId: bi(1002), status: "pending",    creatorId: CO, createdBy: CO },
      { id: bi(1003), uniqueId: "SCH-0003", name: "Carol Davis",     email: "carol@demo.test",   phone: "+1-212-555-0303", date: d("2026-03-22"), startTime: "14:00", endTime: "15:00", appointmentId: bi(1001), status: "completed",  creatorId: CO, createdBy: CO },
      { id: bi(1004), uniqueId: "SCH-0004", name: "David Lee",       email: "david@demo.test",   phone: "+1-469-555-0404", date: d("2026-03-23"), startTime: "11:00", endTime: "12:00", appointmentId: bi(1001), status: "pending",    creatorId: CO, createdBy: CO },
      { id: bi(1005), uniqueId: "SCH-0005", name: "Eva Martinez",    email: "eva@demo.test",     phone: "+1-617-555-0505", date: d("2026-03-25"), startTime: "15:00", endTime: "15:30", appointmentId: bi(1002), status: "approved",   creatorId: CO, createdBy: CO },
      { id: bi(1006), uniqueId: "SCH-0006", name: "Frank Chen",      email: "frank@demo.test",   phone: "+1-206-555-0606", date: d("2026-03-18"), startTime: "09:30", endTime: "10:30", appointmentId: bi(1001), status: "cancelled",  cancelDescription: "Client requested to reschedule", creatorId: CO, createdBy: CO },
      { id: bi(1007), uniqueId: "SCH-0007", name: "Grace Kim",       email: "grace@demo.test",   phone: "+1-512-555-0707", date: d("2026-04-01"), startTime: "13:00", endTime: "14:00", appointmentId: bi(1001), status: "pending",    creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Appointment Callbacks ─────────────────────────────────────────────────
  console.log("[demo-seed] Appointment Callbacks…");
  await prisma.appointmentCallback.createMany({
    data: [
      { id: bi(1001), scheduleId: bi(1006), uniqueCode: "CB-001-FRANK",  appointmentId: bi(1001), reason: "Rescheduling — conflict with work meeting",                date: d("2026-03-25"), startTime: "10:00", endTime: "11:00", status: "pending",   creatorId: CO, createdBy: CO },
      { id: bi(1002), scheduleId: bi(1002), uniqueCode: "CB-002-BOB",    appointmentId: bi(1002), reason: "Request for longer session duration",                     date: d("2026-03-24"), startTime: "09:00", endTime: "09:30", status: "approved",  creatorId: CO, createdBy: CO },
      { id: bi(1003), scheduleId: bi(1004), uniqueCode: "CB-003-DAVID",  appointmentId: bi(1001), reason: "Follow-up on initial consultation outcome",               date: d("2026-04-05"), startTime: "14:00", endTime: "15:00", status: "pending",   creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RECRUITMENT
  // ─────────────────────────────────────────────────────────────────────────

  // ── Job Types ─────────────────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Job Types…");
  await prisma.recJobType.createMany({
    data: [
      { id: bi(2001), name: "Full-Time",  description: "Standard full-time position", isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2002), name: "Part-Time",  description: "Part-time flexible role",     isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2003), name: "Contract",   description: "Fixed-term contract",         isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2004), name: "Freelance",  description: "Project-based freelance work",isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2005), name: "Internship", description: "Student or graduate internship", isActive: true, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Candidate Sources ─────────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Candidate Sources…");
  await prisma.recCandidateSource.createMany({
    data: [
      { id: bi(2001), name: "LinkedIn",      description: "LinkedIn job posting", isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2002), name: "Indeed",        description: "Indeed job board",     isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2003), name: "Referral",      description: "Employee referral",    isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2004), name: "Company Website", description: "Careers page",      isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2005), name: "Job Fair",      description: "Campus / job fair",    isActive: true, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Interview Types ───────────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Interview Types…");
  await prisma.recInterviewType.createMany({
    data: [
      { id: bi(2001), name: "Phone Screen",    description: "Initial phone screening", isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2002), name: "Video Call",      description: "Virtual interview",       isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2003), name: "Technical Test",  description: "Coding / skills test",    isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2004), name: "On-Site",         description: "In-person interview",     isActive: true, creatorId: CO, createdBy: CO },
      { id: bi(2005), name: "Panel Interview", description: "Interview with a panel",  isActive: true, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Job Locations ─────────────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Job Locations…");
  await prisma.recJobLocation.createMany({
    data: [
      { id: bi(2001), name: "New York HQ",      remoteWork: false, address: "100 Main St",  city: "New York",     state: "NY", country: "USA", postalCode: "10001", status: true, creatorId: CO, createdBy: CO },
      { id: bi(2002), name: "San Francisco Office", remoteWork: false, address: "500 Tech Ave", city: "San Francisco", state: "CA", country: "USA", postalCode: "94105", status: true, creatorId: CO, createdBy: CO },
      { id: bi(2003), name: "Remote (Worldwide)", remoteWork: true, city: null, state: null, country: null, status: true, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Custom Questions ──────────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Custom Questions…");
  await prisma.recCustomQuestion.createMany({
    data: [
      { id: bi(2001), question: "What is your current notice period?", type: "text",     options: null, isRequired: true,  isActive: true, sortOrder: 1, creatorId: CO, createdBy: CO },
      { id: bi(2002), question: "Are you willing to relocate?",        type: "radio",    options: "Yes\nNo\nMaybe", isRequired: true,  isActive: true, sortOrder: 2, creatorId: CO, createdBy: CO },
      { id: bi(2003), question: "Expected salary range",               type: "text",     options: null, isRequired: false, isActive: true, sortOrder: 3, creatorId: CO, createdBy: CO },
      { id: bi(2004), question: "How did you hear about us?",          type: "select",   options: "LinkedIn\nIndeed\nReferral\nCompany Website\nOther", isRequired: false, isActive: true, sortOrder: 4, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Job Postings ──────────────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Job Postings…");
  await prisma.recJobPosting.createMany({
    data: [
      {
        id: bi(2001), code: "JP2001", postingCode: "JPC-SENDEV", title: "Senior Full-Stack Developer",
        position: 2, priority: "2", minExperience: 4, maxExperience: 8, minSalary: 90000, maxSalary: 130000,
        description: "We are looking for an experienced full-stack developer to join our product team.",
        requirements: "React, Node.js, PostgreSQL, 4+ years experience",
        skills: "React, TypeScript, Node.js, SQL", benefits: "Health insurance, 401k, Remote work",
        applicationDeadline: "2026-05-01", isPublished: true, isFeatured: true, status: "1",
        jobTypeId: bi(2001), locationId: bi(2003), creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2002), code: "JP2002", postingCode: "JPC-PMGR01", title: "Product Manager",
        position: 1, priority: "1", minExperience: 3, maxExperience: 7, minSalary: 80000, maxSalary: 120000,
        description: "Lead product discovery, roadmap planning, and cross-functional execution.",
        requirements: "3+ years PM experience, agile methodology",
        skills: "Product strategy, JIRA, user research", benefits: "Health insurance, stock options",
        applicationDeadline: "2026-04-15", isPublished: true, isFeatured: false, status: "1",
        jobTypeId: bi(2001), locationId: bi(2001), creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2003), code: "JP2003", postingCode: "JPC-DEVOPS1", title: "DevOps Engineer",
        position: 1, priority: "1", minExperience: 2, maxExperience: 5, minSalary: 75000, maxSalary: 110000,
        description: "Build and maintain CI/CD pipelines, cloud infrastructure, and monitoring systems.",
        requirements: "AWS/GCP, Kubernetes, Docker, Terraform",
        skills: "Kubernetes, Docker, Terraform, CI/CD", benefits: "Health insurance, flexible hours",
        applicationDeadline: "2026-04-30", isPublished: true, isFeatured: false, status: "1",
        jobTypeId: bi(2001), locationId: bi(2003), creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2004), code: "JP2004", postingCode: "JPC-DSGN01", title: "UI/UX Designer",
        position: 1, priority: "0", minExperience: 2, maxExperience: 5, minSalary: 65000, maxSalary: 95000,
        description: "Design user interfaces and experiences for our web and mobile products.",
        requirements: "Figma, user research, 2+ years experience",
        skills: "Figma, Sketch, user research, prototyping",
        applicationDeadline: null, isPublished: false, isFeatured: false, status: "0",
        jobTypeId: bi(2001), locationId: bi(2002), creatorId: CO, createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });

  // ── Interview Rounds ──────────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Interview Rounds…");
  await prisma.recInterviewRound.createMany({
    data: [
      { id: bi(2001), name: "HR Screening",      sequenceNumber: 1, description: "Initial HR screening call",  status: "1", jobId: bi(2001), creatorId: CO, createdBy: CO },
      { id: bi(2002), name: "Technical Round 1", sequenceNumber: 2, description: "Coding assessment",          status: "1", jobId: bi(2001), creatorId: CO, createdBy: CO },
      { id: bi(2003), name: "Final Interview",   sequenceNumber: 3, description: "Culture fit and offer discussion", status: "1", jobId: bi(2001), creatorId: CO, createdBy: CO },
      { id: bi(2004), name: "HR Screening",      sequenceNumber: 1, description: "Initial HR call",            status: "1", jobId: bi(2002), creatorId: CO, createdBy: CO },
      { id: bi(2005), name: "Case Study Round",  sequenceNumber: 2, description: "Product case study review",  status: "1", jobId: bi(2002), creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Candidates ────────────────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Candidates…");
  await prisma.recCandidate.createMany({
    data: [
      {
        id: bi(2001), trackingId: "CND-ALEX01", firstName: "Alex",    lastName: "Turner",
        email: "alex.turner@candidate.test",  phone: "+1-555-0201", gender: "male",
        country: "USA", state: "CA", city: "San Francisco",
        currentCompany: "TechCorp", currentPosition: "Mid-level Developer",
        experienceYears: 5, currentSalary: 85000, expectedSalary: 110000, noticePeriod: "30 days",
        skills: "React, TypeScript, Node.js", status: "2",
        applicationDate: d("2026-03-01"), jobId: bi(2001), sourceId: bi(2001), creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2002), trackingId: "CND-SARA02", firstName: "Sara",    lastName: "Nguyen",
        email: "sara.nguyen@candidate.test",  phone: "+1-555-0202", gender: "female",
        country: "USA", state: "NY", city: "New York",
        currentCompany: "Startup Inc", currentPosition: "Junior Developer",
        experienceYears: 3, currentSalary: 70000, expectedSalary: 95000, noticePeriod: "14 days",
        skills: "Vue.js, Python, PostgreSQL", status: "1",
        applicationDate: d("2026-03-05"), jobId: bi(2001), sourceId: bi(2002), creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2003), trackingId: "CND-MIKE03", firstName: "Mike",    lastName: "Chen",
        email: "mike.chen@candidate.test",    phone: "+1-555-0203", gender: "male",
        country: "Canada", state: "ON", city: "Toronto",
        currentCompany: "DigitalAds", currentPosition: "Product Lead",
        experienceYears: 6, currentSalary: 95000, expectedSalary: 115000, noticePeriod: "60 days",
        skills: "Product strategy, JIRA, SQL", status: "3",
        applicationDate: d("2026-03-02"), jobId: bi(2002), sourceId: bi(2003), creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2004), trackingId: "CND-JESS04", firstName: "Jessica", lastName: "Park",
        email: "jessica.park@candidate.test", phone: "+1-555-0204", gender: "female",
        country: "USA", state: "WA", city: "Seattle",
        currentCompany: "CloudOps", currentPosition: "Site Reliability Engineer",
        experienceYears: 4, currentSalary: 90000, expectedSalary: 105000, noticePeriod: "30 days",
        skills: "Kubernetes, Docker, AWS", status: "0",
        applicationDate: d("2026-03-10"), jobId: bi(2003), sourceId: bi(2004), creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2005), trackingId: "CND-RAVI05", firstName: "Ravi",    lastName: "Patel",
        email: "ravi.patel@candidate.test",   phone: "+1-555-0205", gender: "male",
        country: "India", state: "MH", city: "Mumbai",
        currentCompany: null, currentPosition: null,
        experienceYears: 2, currentSalary: null, expectedSalary: 70000, noticePeriod: "15 days",
        skills: "React, Node.js, MongoDB", status: "4",
        applicationDate: d("2026-02-15"), jobId: bi(2001), sourceId: bi(2001), creatorId: CO, createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });

  // ── Interviews ────────────────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Interviews…");
  await prisma.recInterview.createMany({
    data: [
      {
        id: bi(2001), scheduledDate: "2026-03-18", scheduledTime: "10:00", duration: 30,
        location: null, meetingLink: "https://meet.google.com/abc-def-ghi", status: "2",
        candidateId: bi(2001), jobId: bi(2001), roundId: bi(2001), interviewTypeId: bi(2001),
        creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2002), scheduledDate: "2026-03-22", scheduledTime: "14:00", duration: 90,
        location: null, meetingLink: "https://meet.google.com/xyz-uvw-rst", status: "0",
        candidateId: bi(2001), jobId: bi(2001), roundId: bi(2002), interviewTypeId: bi(2003),
        creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2003), scheduledDate: "2026-03-20", scheduledTime: "11:00", duration: 45,
        location: null, meetingLink: "https://zoom.us/j/123456789", status: "2",
        candidateId: bi(2003), jobId: bi(2002), roundId: bi(2004), interviewTypeId: bi(2002),
        creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2004), scheduledDate: "2026-03-25", scheduledTime: "15:00", duration: 60,
        location: "New York HQ - Room 3B", meetingLink: null, status: "0",
        candidateId: bi(2003), jobId: bi(2002), roundId: bi(2005), interviewTypeId: bi(2004),
        creatorId: CO, createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });

  // ── Offers ────────────────────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Offers…");
  await prisma.recOffer.createMany({
    data: [
      {
        id: bi(2001), candidateId: bi(2005), jobId: bi(2001), position: "Senior Full-Stack Developer",
        offerDate: d("2026-03-10"), salary: 115000, bonus: 10000, benefits: "Health, 401k, Remote, 20 PTO days",
        startDate: d("2026-04-01"), expirationDate: d("2026-03-20"),
        status: "1", approvalStatus: "approved", responseDate: d("2026-03-12"), declineReason: null,
        creatorId: CO, createdBy: CO,
      },
      {
        id: bi(2002), candidateId: bi(2003), jobId: bi(2002), position: "Product Manager",
        offerDate: d("2026-03-15"), salary: 110000, bonus: 8000, benefits: "Health, stock options, Hybrid",
        startDate: d("2026-04-15"), expirationDate: d("2026-03-28"),
        status: "0", approvalStatus: "approved", responseDate: null, declineReason: null,
        creatorId: CO, createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });

  // ── Onboarding Checklists ─────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Onboarding Checklists…");
  await prisma.recOnboardingChecklist.createMany({
    data: [
      { id: bi(2001), name: "Standard Developer Onboarding", description: "Default checklist for new engineering hires", isDefault: true,  status: true, creatorId: CO, createdBy: CO },
      { id: bi(2002), name: "Management Onboarding",         description: "Checklist for management-level hires",        isDefault: false, status: true, creatorId: CO, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Onboarding Checklist Items ────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Onboarding Checklist Items…");
  await prisma.recChecklistItem.createMany({
    data: [
      { id: bi(2001), checklistId: bi(2001), taskName: "Setup laptop & email",      category: "IT",    isRequired: true,  status: false },
      { id: bi(2002), checklistId: bi(2001), taskName: "Complete HR paperwork",      category: "HR",    isRequired: true,  status: false },
      { id: bi(2003), checklistId: bi(2001), taskName: "Access code repository",     category: "IT",    isRequired: true,  status: false },
      { id: bi(2004), checklistId: bi(2001), taskName: "Meet with team lead",        category: "Team",  isRequired: false, status: false },
      { id: bi(2005), checklistId: bi(2001), taskName: "Review coding standards",    category: "Training", isRequired: true,  status: false },
      { id: bi(2006), checklistId: bi(2002), taskName: "Executive briefing",         category: "Leadership", isRequired: true, status: false },
      { id: bi(2007), checklistId: bi(2002), taskName: "Review org chart & strategy", category: "HR", isRequired: true, status: false },
    ],
    skipDuplicates: true,
  });

  // ── Candidate Onboardings ─────────────────────────────────────────────────
  console.log("[demo-seed] Recruitment Candidate Onboardings…");
  await prisma.recCandidateOnboarding.createMany({
    data: [
      {
        id: bi(2001), startDate: d("2026-04-01"), status: "In Progress",
        candidateId: bi(2005), checklistId: bi(2001), creatorId: CO, createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });

  // ── CRM (pipelines, stages, leads, deals, activities) ───────────────────────
  console.log("[demo-seed] CRM…");
  const CRM_PL = bi(6100);
  await prisma.crmPipeline.createMany({
    data: [
      {
        id: CRM_PL,
        name: "Sales Pipeline",
        description: "Default CRM demo pipeline (New → Qualified → Proposal → Negotiation)",
        isDefault: true,
        createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });
  await prisma.crmPipelineStage.createMany({
    data: [
      { id: bi(6101), pipelineId: CRM_PL, name: "New", color: "#6366f1", order: 0, createdBy: CO },
      { id: bi(6102), pipelineId: CRM_PL, name: "Qualified", color: "#f59e0b", order: 1, createdBy: CO },
      { id: bi(6103), pipelineId: CRM_PL, name: "Proposal", color: "#10b981", order: 2, createdBy: CO },
      { id: bi(6104), pipelineId: CRM_PL, name: "Negotiation", color: "#3b82f6", order: 3, createdBy: CO },
    ],
    skipDuplicates: true,
  });
  await prisma.crmLead.createMany({
    data: [
      { id: bi(6110), firstName: "Alex", lastName: "Morgan", email: "alex.m@acme.demo", phone: "+1-415-555-0100", company: "Acme Corp", source: "Website", status: "new", value: 12000, pipelineId: CRM_PL, stageId: bi(6101), createdBy: CO },
      { id: bi(6111), firstName: "Jamie", lastName: "Lee", email: "jamie@techstart.io", phone: "+1-650-555-0200", company: "TechStart Inc", source: "Referral", status: "contacted", value: 25000, pipelineId: CRM_PL, stageId: bi(6102), createdBy: CO },
      { id: bi(6112), firstName: "Sam", lastName: "Rivera", email: "sam@globalparts.com", phone: "+1-212-555-0300", company: "Global Parts Ltd", source: "LinkedIn", status: "qualified", value: 45000, pipelineId: CRM_PL, stageId: bi(6102), createdBy: CO },
      { id: bi(6113), firstName: "Jordan", lastName: "Chen", email: "jordan@northwind.demo", phone: "+1-312-555-0400", company: "Northwind Trading", source: "Cold outreach", status: "proposal", value: 18000, pipelineId: CRM_PL, stageId: bi(6103), createdBy: CO },
      { id: bi(6114), firstName: "Riley", lastName: "Brooks", email: "riley@fabrikam.demo", phone: "+1-469-555-0500", company: "Fabrikam LLC", source: "Webinar", status: "negotiation", value: 67000, pipelineId: CRM_PL, stageId: bi(6104), createdBy: CO },
    ],
    skipDuplicates: true,
  });
  await prisma.crmDeal.createMany({
    data: [
      { id: bi(6120), name: "Acme — Enterprise License", amount: 48000, status: "open", pipelineId: CRM_PL, stageId: bi(6102), leadId: bi(6110), createdBy: CO },
      { id: bi(6121), name: "TechStart — Implementation", amount: 22000, status: "open", pipelineId: CRM_PL, stageId: bi(6103), leadId: bi(6111), createdBy: CO },
      { id: bi(6122), name: "Global Parts — Annual Support", amount: 15000, status: "open", pipelineId: CRM_PL, stageId: bi(6104), leadId: bi(6112), createdBy: CO },
      { id: bi(6123), name: "Northwind — Pilot Project", amount: 8500, status: "won", pipelineId: CRM_PL, stageId: bi(6103), leadId: bi(6113), createdBy: CO },
    ],
    skipDuplicates: true,
  });
  await prisma.crmLeadActivity.createMany({
    data: [
      { id: bi(6130), leadId: bi(6110), userId: CO, type: "call", note: "Discovery call — discussed requirements", createdAt: d("2026-04-02T10:00:00") },
      { id: bi(6131), leadId: bi(6111), userId: CO, type: "meeting", note: "Demo scheduled for next week", createdAt: d("2026-04-05T14:30:00") },
      { id: bi(6132), leadId: bi(6112), userId: CO, type: "note", note: "Sent pricing PDF", createdAt: d("2026-04-08T09:15:00") },
      { id: bi(6133), leadId: bi(6113), userId: CO, type: "call", note: "Follow-up on proposal", createdAt: d("2026-04-10T16:00:00") },
      { id: bi(6134), leadId: bi(6114), userId: CO, type: "note", note: "Legal review in progress", createdAt: d("2026-04-12T11:00:00") },
      { id: bi(6135), leadId: bi(6110), userId: CO, type: "call", note: "Quarterly check-in", createdAt: d("2026-04-15T10:00:00") },
    ],
    skipDuplicates: true,
  });
  try {
    await syncCrmPostgresSequences(prisma);
  } catch (e) {
    console.warn("[demo-seed] CRM sequence sync skipped or failed:", e?.message ?? e);
  }

  // ── Support Ticket addon (st_tickets, KB, FAQ, contacts — not Helpdesk models) ─
  console.log("[demo-seed] Support Ticket…");
  const STC_BILL = bi(9601);
  const STC_TECH = bi(9602);
  const STC_GEN = bi(9603);
  await prisma.stTicketCategory.createMany({
    data: [
      { id: STC_BILL, name: "Billing", color: "#6366F1" },
      { id: STC_TECH, name: "Technical", color: "#F59E0B" },
      { id: STC_GEN, name: "General", color: "#10B981" },
    ],
    skipDuplicates: true,
  });
  const KBC_A = bi(9611);
  const KBC_B = bi(9612);
  await prisma.stKnowledgeBaseCategory.createMany({
    data: [
      { id: KBC_A, name: "Getting Started" },
      { id: KBC_B, name: "Account & Billing" },
    ],
    skipDuplicates: true,
  });
  await prisma.stKnowledgeBase.createMany({
    data: [
      {
        id: bi(9621),
        title: "How to open a support ticket",
        categoryId: KBC_A,
        description: "Submit and track tickets from Support Ticket → Tickets.",
        createdBy: CO,
      },
      {
        id: bi(9622),
        title: "Reset your password",
        categoryId: KBC_A,
        description: "Use “Forgot password” on the login screen to receive a reset link.",
        createdBy: CO,
      },
      {
        id: bi(9623),
        title: "Understanding invoices",
        categoryId: KBC_B,
        description: "View and download invoices under Accounting or ask billing support.",
        createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });
  await prisma.stFaq.createMany({
    data: [
      {
        id: bi(9631),
        title: "How do I contact support?",
        answer: "Use Contact under Support Ticket or create a ticket on the Tickets page.",
        createdBy: CO,
      },
      {
        id: bi(9632),
        title: "What are your business hours?",
        answer: "Standard support: Monday–Friday, 9:00–18:00 (local office time).",
        createdBy: CO,
      },
      {
        id: bi(9633),
        title: "Typical response time?",
        answer: "Most requests receive a first response within one business day.",
        createdBy: CO,
      },
    ],
    skipDuplicates: true,
  });
  await prisma.stContact.createMany({
    data: [
      {
        id: bi(9641),
        name: "Jordan Lee",
        email: "jordan.lee@contact.demo",
        subject: "Billing question",
        message: "Please clarify the line items on invoice #2048.",
      },
      {
        id: bi(9642),
        name: "Samira Khan",
        email: "samira.khan@contact.demo",
        subject: "API webhook",
        message: "Our webhook endpoint returns 502 — need guidance.",
      },
    ],
    skipDuplicates: true,
  });
  await prisma.stQuickLink.createMany({
    data: [
      { id: bi(9651), title: "Manage Tickets", icon: "Ticket", link: "/support-ticket/tickets" },
      { id: bi(9652), title: "Knowledge Base", icon: "BookOpen", link: "/support-ticket/knowledge-base" },
    ],
    skipDuplicates: true,
  });
  await prisma.stCustomPage.createMany({
    data: [
      {
        id: bi(9661),
        title: "Support overview",
        slug: "support-overview-demo",
        description: "Demo custom page for Support Ticket system setup.",
        contents: "<p>Welcome to Paper Flight support. Browse the knowledge base or open a ticket.</p>",
        enableFooter: true,
      },
    ],
    skipDuplicates: true,
  });

  const attachEmpty = [];
  await prisma.stTicket.createMany({
    data: [
      {
        id: bi(9701),
        ticketCode: "ST-DEMO-001",
        name: "Alice Carter",
        email: "alice@demo.test",
        subject: "Cannot access dashboard",
        categoryId: STC_TECH,
        status: "in_progress",
        description: "403 error after SSO login.",
        attachments: attachEmpty,
        createdBy: CO,
        createdAt: d("2026-01-08T10:00:00"),
      },
      {
        id: bi(9702),
        ticketCode: "ST-DEMO-002",
        name: "Ben Ortiz",
        email: "ben@demo.test",
        subject: "Invoice PDF missing",
        categoryId: STC_BILL,
        status: "open",
        description: "Last invoice attachment was empty.",
        attachments: attachEmpty,
        createdBy: CO,
        createdAt: d("2026-01-22T15:30:00"),
      },
      {
        id: bi(9703),
        ticketCode: "ST-DEMO-003",
        name: "Casey Ng",
        email: "casey@demo.test",
        subject: "Feature request — export",
        categoryId: STC_GEN,
        status: "on_hold",
        description: "Waiting on product confirmation.",
        attachments: attachEmpty,
        createdBy: CO,
        createdAt: d("2026-02-14T09:00:00"),
      },
      {
        id: bi(9704),
        ticketCode: "ST-DEMO-004",
        name: "Dana White",
        email: "dana@demo.test",
        subject: "Mobile layout issue",
        categoryId: STC_TECH,
        status: "closed",
        description: "Resolved in v2.4.",
        attachments: attachEmpty,
        createdBy: CO,
        createdAt: d("2026-02-28T11:20:00"),
      },
      {
        id: bi(9705),
        ticketCode: "ST-DEMO-005",
        name: "Evan Park",
        email: "evan@demo.test",
        subject: "User seat limits",
        categoryId: STC_BILL,
        status: "closed",
        description: "Upgraded plan; issue closed.",
        attachments: attachEmpty,
        createdBy: CO,
        createdAt: d("2026-03-10T08:45:00"),
      },
      {
        id: bi(9706),
        ticketCode: "ST-DEMO-006",
        name: "Fran Diaz",
        email: "fran@demo.test",
        subject: "Slow report load",
        categoryId: STC_TECH,
        status: "in_progress",
        description: "Profiler attached.",
        attachments: attachEmpty,
        createdBy: CO,
        createdAt: d("2026-03-25T13:10:00"),
      },
      {
        id: bi(9707),
        ticketCode: "ST-DEMO-007",
        name: "Gina Wu",
        email: "gina@demo.test",
        subject: "How to add a new branch",
        categoryId: STC_GEN,
        status: "open",
        description: "Documentation link requested.",
        attachments: attachEmpty,
        createdBy: CO,
        createdAt: d("2026-04-05T16:00:00"),
      },
      {
        id: bi(9708),
        ticketCode: "ST-DEMO-008",
        name: "Hugo Blake",
        email: "hugo@demo.test",
        subject: "Closed — thank you",
        categoryId: STC_GEN,
        status: "closed",
        description: "Customer confirmed resolution.",
        attachments: attachEmpty,
        createdBy: CO,
        createdAt: d("2026-04-12T10:00:00"),
      },
      {
        id: bi(9709),
        ticketCode: "ST-DEMO-009",
        name: "Ivy Chen",
        email: "ivy@demo.test",
        subject: "Created today — urgent",
        categoryId: STC_TECH,
        status: "open",
        description: "Demo ticket for “today” metrics.",
        attachments: attachEmpty,
        createdBy: CO,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  console.log("[demo-seed] ✓ All demo data seeded successfully.");
  console.log("[demo-seed] Summary:");
  console.log("  Accounting:   +3 demo bank accounts, +3 bank transactions, +1 category, +1 account type, +2 chart lines, +8 revenues, +9 expenses, +5 customer payments, +5 vendor payments, +3 credit notes, +3 debit notes, +3 internal bank transfers, +3 sales proposals, +3 warehouses, +5 customers, +3 vendors");
  console.log("  Helpdesk:     +5 categories, +8 tickets, +7 replies");
  console.log("  Taskly:       +4 task stages, +4 bug stages, +3 projects, +4 milestones, +9 tasks, +5 bugs");
  console.log("  HRM:          +2 branches, +5 departments, +8 designations, +4 shifts, +10 employees, +5 leave types, +8 holidays, +4 award types, +4 awards, +2 promotions, +2 warnings, +2 complaints, +2 resignations, +1 termination, +2 transfers, +6 documents, +5 salary allocations, +7 payrolls, ~42 attendances");
  console.log("  Appointment:  +7 business hours, +4 settings, +5 questions, +3 appointment types, +7 schedules, +3 callbacks");
  console.log("  Recruitment:  +5 job types, +5 candidate sources, +5 interview types, +3 locations, +4 custom questions, +4 job postings, +5 interview rounds, +5 candidates, +4 interviews, +2 offers, +2 checklists, +7 checklist items, +1 onboarding");
  console.log("  CRM:          +1 pipeline, +4 stages, +5 leads, +4 deals, +6 lead activities");
  console.log("  Support ST:   +3 ticket categories, +9 tickets, +2 KB categories, +3 KB articles, +3 FAQs, +2 contacts, +2 quick links, +1 custom page");
}

main()
  .catch((e) => {
    console.error("[demo-seed] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
