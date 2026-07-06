// POS demo data seed
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CO = 1000n;
const bi = (n) => BigInt(n);
const d = (s) => new Date(s);

async function main() {
  console.log("[pos-seed] Starting POS demo seed…");

  // ── Categories ────────────────────────────────────────────────────────────
  console.log("[pos-seed] Categories…");
  await prisma.posCategory.createMany({
    data: [
      { id: bi(3001), name: "Electronics",      description: "Electronic gadgets and accessories", createdBy: CO },
      { id: bi(3002), name: "Food & Beverages", description: "Edibles and drinks",                 createdBy: CO },
      { id: bi(3003), name: "Home & Garden",    description: "Home decor and garden supplies",      createdBy: CO },
      { id: bi(3004), name: "Office Supplies",  description: "Stationery and office essentials",   createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Brands ────────────────────────────────────────────────────────────────
  console.log("[pos-seed] Brands…");
  await prisma.posBrand.createMany({
    data: [
      { id: bi(3001), name: "TechLine",   description: "Electronics brand", createdBy: CO },
      { id: bi(3002), name: "GreenLeaf",  description: "Eco products",      createdBy: CO },
      { id: bi(3003), name: "OfficePro",  description: "Office essentials", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Units ─────────────────────────────────────────────────────────────────
  console.log("[pos-seed] Units…");
  await prisma.posUnit.createMany({
    data: [
      { id: bi(3001), name: "Piece", shortName: "pcs", createdBy: CO },
      { id: bi(3002), name: "Kilogram", shortName: "kg", createdBy: CO },
      { id: bi(3003), name: "Liter",    shortName: "ltr", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Tax ───────────────────────────────────────────────────────────────────
  console.log("[pos-seed] Taxes…");
  await prisma.posTax.createMany({
    data: [
      { id: bi(3001), name: "GST 10%", rate: 10, createdBy: CO },
      { id: bi(3002), name: "GST 5%",  rate: 5,  createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Customers ─────────────────────────────────────────────────────────────
  console.log("[pos-seed] Customers…");
  await prisma.posCustomer.createMany({
    data: [
      { id: bi(3001), name: "Walk-in Customer", email: null,                            phone: null,           isActive: true, createdBy: CO },
      { id: bi(3002), name: "John Doe",          email: "john.doe@example.com",         phone: "+1-555-3001",  isActive: true, createdBy: CO },
      { id: bi(3003), name: "Jane Smith",        email: "jane.smith@example.com",       phone: "+1-555-3002",  isActive: true, createdBy: CO },
      { id: bi(3004), name: "Mike Johnson",      email: "mike.j@example.com",           phone: "+1-555-3003",  isActive: true, createdBy: CO },
      { id: bi(3005), name: "Sarah Lee",         email: "sarah.lee@example.com",        phone: "+1-555-3004",  isActive: true, createdBy: CO },
      { id: bi(3006), name: "Bob Wilson",        email: "bob.wilson@example.com",       phone: "+1-555-3005",  isActive: true, createdBy: CO },
      { id: bi(3007), name: "Lisa Anderson",     email: "lisa.anderson@example.com",    phone: "+1-555-3006",  isActive: true, createdBy: CO },
      { id: bi(3008), name: "Tom Davis",         email: "tom.davis@example.com",        phone: "+1-555-3007",  isActive: true, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Vendors ───────────────────────────────────────────────────────────────
  console.log("[pos-seed] Vendors…");
  await prisma.posVendor.createMany({
    data: [
      { id: bi(3001), name: "Global Electronics Ltd",    email: "supply@globalelec.demo",  phone: "+1-800-3001", isActive: true, createdBy: CO },
      { id: bi(3002), name: "Fresh Foods Wholesale",     email: "orders@freshfoods.demo",  phone: "+1-800-3002", isActive: true, createdBy: CO },
      { id: bi(3003), name: "Garden Supplies Co.",       email: "info@gardensupply.demo",  phone: "+1-800-3003", isActive: true, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Branches ──────────────────────────────────────────────────────────────
  console.log("[pos-seed] Branches…");
  await prisma.posBranch.createMany({
    data: [
      { id: bi(3001), name: "Main Store",       email: "main@paperflight.demo",     phone: "+1-555-8001", address: "100 Main St, New York, NY", createdBy: CO },
      { id: bi(3002), name: "Downtown Branch",  email: "downtown@paperflight.demo", phone: "+1-555-8002", address: "250 Downtown Ave, Chicago, IL", createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Products ──────────────────────────────────────────────────────────────
  console.log("[pos-seed] Products…");
  await prisma.posProduct.createMany({
    data: [
      // In-stock products
      { id: bi(3001), name: "Raspberry",         price: 5.99,  cost: 3.50, stock: 200, stockAlert: 20, categoryId: bi(3002), brandId: bi(3002), unitId: bi(3002), isActive: true, createdBy: CO },
      { id: bi(3002), name: "Light Bulb",        price: 12.50, cost: 7.00, stock: 150, stockAlert: 15, categoryId: bi(3003), brandId: bi(3001), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3003), name: "Plant Pot",         price: 18.00, cost: 9.00, stock: 80,  stockAlert: 10, categoryId: bi(3003), brandId: bi(3002), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3004), name: "USB Cable",         price: 8.00,  cost: 3.00, stock: 120, stockAlert: 20, categoryId: bi(3001), brandId: bi(3001), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3005), name: "Wireless Mouse",    price: 25.00, cost: 14.00, stock: 60, stockAlert: 10, categoryId: bi(3001), brandId: bi(3001), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3006), name: "Coffee Beans",      price: 22.00, cost: 12.00, stock: 90, stockAlert: 15, categoryId: bi(3002), brandId: bi(3002), unitId: bi(3002), isActive: true, createdBy: CO },
      { id: bi(3007), name: "Notebook A5",       price: 7.50,  cost: 3.00, stock: 200, stockAlert: 30, categoryId: bi(3004), brandId: bi(3003), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3008), name: "Desk Organizer",    price: 19.99, cost: 10.00, stock: 45, stockAlert: 10, categoryId: bi(3004), brandId: bi(3003), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3009), name: "Bluetooth Speaker", price: 65.00, cost: 35.00, stock: 30, stockAlert: 5,  categoryId: bi(3001), brandId: bi(3001), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3010), name: "Water Bottle 1L",   price: 14.99, cost: 6.00, stock: 100, stockAlert: 20, categoryId: bi(3003), brandId: bi(3002), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3011), name: "Headphones",        price: 45.00, cost: 22.00, stock: 40, stockAlert: 8,  categoryId: bi(3001), brandId: bi(3001), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3012), name: "Potting Mix 5kg",   price: 11.00, cost: 5.00, stock: 70,  stockAlert: 10, categoryId: bi(3003), brandId: bi(3002), unitId: bi(3002), isActive: true, createdBy: CO },
      // Out-of-stock products
      { id: bi(3013), name: "Smart Watch",       price: 120.00, cost: 65.00, stock: 0, stockAlert: 5, categoryId: bi(3001), brandId: bi(3001), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3014), name: "Power Bank 20000mAh", price: 40.00, cost: 20.00, stock: 0, stockAlert: 5, categoryId: bi(3001), brandId: bi(3001), unitId: bi(3001), isActive: true, createdBy: CO },
      { id: bi(3015), name: "Desk Lamp LED",     price: 35.00, cost: 18.00, stock: 0, stockAlert: 5, categoryId: bi(3003), brandId: bi(3001), unitId: bi(3001), isActive: true, createdBy: CO },
    ],
    skipDuplicates: true,
  });

  // ── Sales ─────────────────────────────────────────────────────────────────
  console.log("[pos-seed] Sales…");

  // Helper to create a sale with items
  async function createSale({ id, number, customerId, branchId, date, items }) {
    const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
    const taxAmount = subtotal * 0.1;
    const total = subtotal + taxAmount;
    await prisma.posSale.upsert({
      where: { id },
      create: {
        id, number, customerId, branchId,
        subtotal, taxAmount, discount: 0, total, paid: total,
        paymentMethod: customerId ? "card" : "cash",
        status: "completed",
        date,
        createdBy: CO,
        items: {
          create: items.map((it, i) => ({
            id: id * 100n + BigInt(i + 1),
            productId: it.productId,
            name: it.name,
            qty: it.qty,
            price: it.price,
            discount: 0,
            taxRate: 10,
            subtotal: it.price * it.qty,
          })),
        },
      },
      update: {},
    });
  }

  const salesData = [
    // Last 14 days of sales — varied amounts per day
    { id: bi(3001), number: "#POS30001", customerId: bi(3002), branchId: bi(3001), date: d("2026-03-09"), items: [{ productId: bi(3001), name: "Raspberry", qty: 5, price: 5.99 }, { productId: bi(3007), name: "Notebook A5", qty: 3, price: 7.50 }] },
    { id: bi(3002), number: "#POS30002", customerId: bi(3003), branchId: bi(3001), date: d("2026-03-09"), items: [{ productId: bi(3002), name: "Light Bulb", qty: 4, price: 12.50 }, { productId: bi(3010), name: "Water Bottle 1L", qty: 2, price: 14.99 }] },
    { id: bi(3003), number: "#POS30003", customerId: bi(3001), branchId: bi(3002), date: d("2026-03-10"), items: [{ productId: bi(3004), name: "USB Cable", qty: 6, price: 8.00 }] },
    { id: bi(3004), number: "#POS30004", customerId: bi(3004), branchId: bi(3001), date: d("2026-03-10"), items: [{ productId: bi(3005), name: "Wireless Mouse", qty: 2, price: 25.00 }, { productId: bi(3004), name: "USB Cable", qty: 2, price: 8.00 }] },
    { id: bi(3005), number: "#POS30005", customerId: bi(3001), branchId: bi(3001), date: d("2026-03-11"), items: [{ productId: bi(3006), name: "Coffee Beans", qty: 3, price: 22.00 }] },
    { id: bi(3006), number: "#POS30006", customerId: bi(3005), branchId: bi(3002), date: d("2026-03-11"), items: [{ productId: bi(3003), name: "Plant Pot", qty: 2, price: 18.00 }, { productId: bi(3012), name: "Potting Mix 5kg", qty: 3, price: 11.00 }] },
    { id: bi(3007), number: "#POS30007", customerId: bi(3006), branchId: bi(3001), date: d("2026-03-12"), items: [{ productId: bi(3011), name: "Headphones", qty: 1, price: 45.00 }] },
    { id: bi(3008), number: "#POS30008", customerId: bi(3001), branchId: bi(3001), date: d("2026-03-12"), items: [{ productId: bi(3001), name: "Raspberry", qty: 8, price: 5.99 }, { productId: bi(3006), name: "Coffee Beans", qty: 1, price: 22.00 }] },
    { id: bi(3009), number: "#POS30009", customerId: bi(3007), branchId: bi(3002), date: d("2026-03-13"), items: [{ productId: bi(3009), name: "Bluetooth Speaker", qty: 1, price: 65.00 }, { productId: bi(3010), name: "Water Bottle 1L", qty: 1, price: 14.99 }] },
    { id: bi(3010), number: "#POS30010", customerId: bi(3002), branchId: bi(3001), date: d("2026-03-13"), items: [{ productId: bi(3002), name: "Light Bulb", qty: 5, price: 12.50 }, { productId: bi(3008), name: "Desk Organizer", qty: 2, price: 19.99 }] },
    { id: bi(3011), number: "#POS30011", customerId: bi(3001), branchId: bi(3001), date: d("2026-03-14"), items: [{ productId: bi(3007), name: "Notebook A5", qty: 6, price: 7.50 }] },
    { id: bi(3012), number: "#POS30012", customerId: bi(3008), branchId: bi(3002), date: d("2026-03-14"), items: [{ productId: bi(3005), name: "Wireless Mouse", qty: 3, price: 25.00 }] },
    { id: bi(3013), number: "#POS30013", customerId: bi(3003), branchId: bi(3001), date: d("2026-03-15"), items: [{ productId: bi(3003), name: "Plant Pot", qty: 4, price: 18.00 }, { productId: bi(3010), name: "Water Bottle 1L", qty: 2, price: 14.99 }] },
    { id: bi(3014), number: "#POS30014", customerId: bi(3004), branchId: bi(3001), date: d("2026-03-15"), items: [{ productId: bi(3011), name: "Headphones", qty: 2, price: 45.00 }] },
    { id: bi(3015), number: "#POS30015", customerId: bi(3001), branchId: bi(3002), date: d("2026-03-16"), items: [{ productId: bi(3001), name: "Raspberry", qty: 10, price: 5.99 }, { productId: bi(3006), name: "Coffee Beans", qty: 2, price: 22.00 }] },
    { id: bi(3016), number: "#POS30016", customerId: bi(3005), branchId: bi(3001), date: d("2026-03-16"), items: [{ productId: bi(3004), name: "USB Cable", qty: 5, price: 8.00 }, { productId: bi(3007), name: "Notebook A5", qty: 4, price: 7.50 }] },
    { id: bi(3017), number: "#POS30017", customerId: bi(3006), branchId: bi(3001), date: d("2026-03-17"), items: [{ productId: bi(3009), name: "Bluetooth Speaker", qty: 2, price: 65.00 }] },
    { id: bi(3018), number: "#POS30018", customerId: bi(3007), branchId: bi(3002), date: d("2026-03-17"), items: [{ productId: bi(3002), name: "Light Bulb", qty: 6, price: 12.50 }, { productId: bi(3008), name: "Desk Organizer", qty: 1, price: 19.99 }] },
    { id: bi(3019), number: "#POS30019", customerId: bi(3002), branchId: bi(3001), date: d("2026-03-18"), items: [{ productId: bi(3005), name: "Wireless Mouse", qty: 2, price: 25.00 }, { productId: bi(3010), name: "Water Bottle 1L", qty: 3, price: 14.99 }] },
    { id: bi(3020), number: "#POS30020", customerId: bi(3001), branchId: bi(3001), date: d("2026-03-18"), items: [{ productId: bi(3001), name: "Raspberry", qty: 7, price: 5.99 }, { productId: bi(3012), name: "Potting Mix 5kg", qty: 2, price: 11.00 }] },
    { id: bi(3021), number: "#POS30021", customerId: bi(3003), branchId: bi(3002), date: d("2026-03-19"), items: [{ productId: bi(3011), name: "Headphones", qty: 1, price: 45.00 }, { productId: bi(3004), name: "USB Cable", qty: 3, price: 8.00 }] },
    { id: bi(3022), number: "#POS30022", customerId: bi(3008), branchId: bi(3001), date: d("2026-03-19"), items: [{ productId: bi(3006), name: "Coffee Beans", qty: 2, price: 22.00 }, { productId: bi(3003), name: "Plant Pot", qty: 1, price: 18.00 }] },
    { id: bi(3023), number: "#POS30023", customerId: bi(3004), branchId: bi(3001), date: d("2026-03-20"), items: [{ productId: bi(3009), name: "Bluetooth Speaker", qty: 1, price: 65.00 }, { productId: bi(3007), name: "Notebook A5", qty: 5, price: 7.50 }] },
    { id: bi(3024), number: "#POS30024", customerId: bi(3001), branchId: bi(3002), date: d("2026-03-20"), items: [{ productId: bi(3002), name: "Light Bulb", qty: 8, price: 12.50 }] },
    { id: bi(3025), number: "#POS30025", customerId: bi(3005), branchId: bi(3001), date: d("2026-03-21"), items: [{ productId: bi(3005), name: "Wireless Mouse", qty: 1, price: 25.00 }, { productId: bi(3010), name: "Water Bottle 1L", qty: 4, price: 14.99 }] },
    { id: bi(3026), number: "#POS30026", customerId: bi(3006), branchId: bi(3001), date: d("2026-03-21"), items: [{ productId: bi(3001), name: "Raspberry", qty: 12, price: 5.99 }, { productId: bi(3006), name: "Coffee Beans", qty: 2, price: 22.00 }] },
    { id: bi(3027), number: "#POS30027", customerId: bi(3007), branchId: bi(3002), date: d("2026-03-22"), items: [{ productId: bi(3008), name: "Desk Organizer", qty: 3, price: 19.99 }, { productId: bi(3012), name: "Potting Mix 5kg", qty: 2, price: 11.00 }] },
    { id: bi(3028), number: "#POS30028", customerId: bi(3003), branchId: bi(3001), date: d("2026-03-22"), items: [{ productId: bi(3011), name: "Headphones", qty: 2, price: 45.00 }, { productId: bi(3004), name: "USB Cable", qty: 4, price: 8.00 }] },
  ];

  for (const sale of salesData) {
    await createSale(sale);
  }

  // ── Expenses ──────────────────────────────────────────────────────────────
  console.log("[pos-seed] Expense categories + expenses…");
  await prisma.posExpenseCategory.createMany({
    data: [
      { id: bi(3001), name: "Utilities",    createdBy: CO },
      { id: bi(3002), name: "Rent",         createdBy: CO },
      { id: bi(3003), name: "Marketing",    createdBy: CO },
    ],
    skipDuplicates: true,
  });
  await prisma.posExpense.createMany({
    data: [
      { id: bi(3001), title: "Monthly Rent – Main Store",    amount: 2500, categoryId: bi(3002), branchId: bi(3001), date: d("2026-03-01"), createdBy: CO },
      { id: bi(3002), title: "Electricity Bill – March",      amount: 380,  categoryId: bi(3001), branchId: bi(3001), date: d("2026-03-05"), createdBy: CO },
      { id: bi(3003), title: "Social Media Ads – March",      amount: 600,  categoryId: bi(3003), branchId: bi(3001), date: d("2026-03-10"), createdBy: CO },
      { id: bi(3004), title: "Monthly Rent – Downtown",       amount: 1800, categoryId: bi(3002), branchId: bi(3002), date: d("2026-03-01"), createdBy: CO },
      { id: bi(3005), title: "Internet & Phone – March",      amount: 150,  categoryId: bi(3001), branchId: bi(3002), date: d("2026-03-07"), createdBy: CO },
    ],
    skipDuplicates: true,
  });

  console.log("[pos-seed] Done! POS demo data seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
