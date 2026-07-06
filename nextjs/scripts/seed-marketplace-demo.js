/* eslint-disable no-console */
/**
 * Seeds an END-TO-END Marketplace demo across MULTIPLE vendors so you can follow
 * the whole flow in the UI, including BOTH delivery-queue pages:
 *
 *   1. Vendors (5) + categories + products
 *   2. Buyer companies (tenant `users` of type "company", shown in Companies list)
 *   3. Paid orders + order items + order lines (storefront checkout result)
 *   4. City delivery queues  -> /marketplace/admin/delivery-queue   (singular)
 *        - "waiting"           -> below the 50-unit minimum
 *        - "ready_to_schedule" -> reached the minimum, awaiting an operator
 *        - "scheduled"         -> a city DeliveryEvent was created
 *   5. City delivery events + attached orders (admin city scheduling result)
 *   6. Named delivery queues -> /marketplace/admin/delivery-queues  (plural)
 *        - one MarketplaceDeliveryQueue per vendor region
 *        - one MarketplaceDelivery per order (linked to the queue)
 *        - MarketplaceDeliveryEvent timeline rows per delivery
 *   7. A delivered run per vendor (history) so the completed state is visible too
 *
 * Every demo row is tagged so re-running is safe and fully idempotent:
 *   - Orders use the order-number prefix `MP-DEMO-`
 *   - Companies use `demo+...@waterice.test` emails
 *   - City + named delivery queues/events carry the `[demo-seed]` marker
 * Vendors and products are UPSERTED (kept stable across runs); orders, deliveries,
 * queues and events are removed and rebuilt on every run.
 *
 * Prereq: marketplace tables must exist (npm run db:setup:marketplace).
 * Usage:  node ./scripts/seed-marketplace-demo.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

const ORDER_PREFIX = "MP-DEMO-";
const EVENT_MARKER = "[demo-seed]";
const LARAVEL_USER_MORPH_TYPE = "App\\Models\\User";
const DEMO_PASSWORD = "Demo1234!";
const REQUIRED_MINIMUM = 50;

// --- Buyer companies (tenants). Idempotent by email. ---
const COMPANIES = [
  { key: "sunshine", name: "Sunshine Catering Co", email: "demo+sunshine@waterice.test", slug: "sunshine-catering-co" },
  { key: "beachside", name: "Beachside Events LLC", email: "demo+beachside@waterice.test", slug: "beachside-events-llc" },
  { key: "downtown", name: "Downtown Festivals Inc", email: "demo+downtown@waterice.test", slug: "downtown-festivals-inc" },
  { key: "riverside", name: "Riverside Concessions", email: "demo+riverside@waterice.test", slug: "riverside-concessions" },
  { key: "lakeside", name: "Lakeside Resorts Group", email: "demo+lakeside@waterice.test", slug: "lakeside-resorts-group" },
];

/**
 * Vendors with their catalog + an order script. `unit` products carry a
 * bucketCountValue >= 1 (they count toward the city minimum); `supply` products
 * are accessories (bucketCountValue 0). Each order: `units` of the first unit
 * product + optional `supplyQty` of the supply product.
 *
 * Stages per city order group:
 *   scheduled | delivered -> a city delivery event is created
 *   ready                 -> city total reaches the 50-unit minimum (awaiting op)
 *   waiting               -> below the minimum
 */
const VENDORS = [
  {
    slug: "water-ice-express",
    name: "Water Ice Express",
    region: "Florida",
    description: "Water ice buckets, coolers, cups, spoons, napkins and event-ready frozen products.",
    products: [
      { name: "Cherry Water Ice Bucket", slug: "cherry-water-ice-bucket", category: "Water Ice Buckets", price: 24.99, bucketCountValue: 1, sku: "WIE-BUCKET-CHERRY" },
      { name: "Lemon Water Ice Bucket", slug: "lemon-water-ice-bucket", category: "Water Ice Buckets", price: 24.99, bucketCountValue: 1, sku: "WIE-BUCKET-LEMON" },
      { name: "Blue Raspberry Water Ice Bucket", slug: "blue-raspberry-water-ice-bucket", category: "Water Ice Buckets", price: 25.99, bucketCountValue: 1, sku: "WIE-BUCKET-BLUERASP" },
      { name: "Cups Pack", slug: "cups-pack", category: "Cups", price: 12.99, bucketCountValue: 0, sku: "WIE-CUPS-100", supply: true },
    ],
    orders: [
      { company: "sunshine", city: "Jacksonville", state: "FL", units: 30, supplyQty: 1, stage: "scheduled", daysAgo: 9 },
      { company: "beachside", city: "Jacksonville", state: "FL", units: 25, supplyQty: 0, stage: "scheduled", daysAgo: 8 },
      { company: "sunshine", city: "Tampa", state: "FL", units: 30, supplyQty: 1, stage: "ready", daysAgo: 4 },
      { company: "riverside", city: "Tampa", state: "FL", units: 20, supplyQty: 0, stage: "ready", daysAgo: 3 },
      { company: "downtown", city: "Orlando", state: "FL", units: 20, supplyQty: 1, stage: "waiting", daysAgo: 2 },
      { company: "beachside", city: "Miami", state: "FL", units: 50, supplyQty: 2, stage: "delivered", daysAgo: 20 },
    ],
  },
  {
    slug: "frosty-treats-co",
    name: "Frosty Treats Co",
    region: "Southeast",
    description: "Premium ice cream tubs, gelato and dessert toppings for events and resellers.",
    products: [
      { name: "Vanilla Ice Cream Tub", slug: "vanilla-ice-cream-tub", category: "Ice Cream", price: 29.99, bucketCountValue: 1, sku: "FT-TUB-VANILLA" },
      { name: "Chocolate Ice Cream Tub", slug: "chocolate-ice-cream-tub", category: "Ice Cream", price: 29.99, bucketCountValue: 1, sku: "FT-TUB-CHOC" },
      { name: "Strawberry Ice Cream Tub", slug: "strawberry-ice-cream-tub", category: "Ice Cream", price: 31.99, bucketCountValue: 1, sku: "FT-TUB-STRAW" },
      { name: "Rainbow Sprinkles Pack", slug: "rainbow-sprinkles-pack", category: "Toppings", price: 8.99, bucketCountValue: 0, sku: "FT-SPRINKLES", supply: true },
    ],
    orders: [
      { company: "lakeside", city: "Atlanta", state: "GA", units: 28, supplyQty: 2, stage: "scheduled", daysAgo: 7 },
      { company: "downtown", city: "Atlanta", state: "GA", units: 24, supplyQty: 0, stage: "scheduled", daysAgo: 6 },
      { company: "sunshine", city: "Charlotte", state: "NC", units: 50, supplyQty: 1, stage: "ready", daysAgo: 5 },
      { company: "beachside", city: "Savannah", state: "GA", units: 18, supplyQty: 1, stage: "waiting", daysAgo: 1 },
      { company: "lakeside", city: "Nashville", state: "TN", units: 55, supplyQty: 3, stage: "delivered", daysAgo: 22 },
    ],
  },
  {
    slug: "sweet-snacks-supply",
    name: "Sweet Snacks Supply",
    region: "Northeast",
    description: "Soft pretzels, popcorn, cotton candy and concession-stand snack supplies.",
    products: [
      { name: "Soft Pretzel Box", slug: "soft-pretzel-box", category: "Snacks", price: 18.5, bucketCountValue: 1, sku: "SS-PRETZEL" },
      { name: "Gourmet Popcorn Crate", slug: "gourmet-popcorn-crate", category: "Snacks", price: 21.0, bucketCountValue: 1, sku: "SS-POPCORN" },
      { name: "Cotton Candy Pack", slug: "cotton-candy-pack", category: "Snacks", price: 15.75, bucketCountValue: 1, sku: "SS-COTTONCANDY" },
      { name: "Napkins Pack", slug: "snack-napkins-pack", category: "Supplies", price: 4.99, bucketCountValue: 0, sku: "SS-NAPKINS", supply: true },
    ],
    orders: [
      { company: "downtown", city: "Philadelphia", state: "PA", units: 32, supplyQty: 2, stage: "scheduled", daysAgo: 10 },
      { company: "riverside", city: "Philadelphia", state: "PA", units: 26, supplyQty: 1, stage: "scheduled", daysAgo: 9 },
      { company: "beachside", city: "Boston", state: "MA", units: 22, supplyQty: 0, stage: "waiting", daysAgo: 2 },
      { company: "sunshine", city: "New York", state: "NY", units: 50, supplyQty: 4, stage: "delivered", daysAgo: 25 },
    ],
  },
  {
    slug: "beverage-bros",
    name: "Beverage Bros",
    region: "Midwest",
    description: "Lemonade, iced tea and soda concentrates plus cups, lids and dispensing supplies.",
    products: [
      { name: "Lemonade Concentrate", slug: "lemonade-concentrate", category: "Beverages", price: 22.0, bucketCountValue: 1, sku: "BB-LEMONADE" },
      { name: "Iced Tea Concentrate", slug: "iced-tea-concentrate", category: "Beverages", price: 22.0, bucketCountValue: 1, sku: "BB-ICEDTEA" },
      { name: "Cola Soda Syrup", slug: "cola-soda-syrup", category: "Beverages", price: 24.5, bucketCountValue: 1, sku: "BB-COLA" },
      { name: "Cup Lids Pack", slug: "cup-lids-pack", category: "Supplies", price: 6.5, bucketCountValue: 0, sku: "BB-LIDS", supply: true },
    ],
    orders: [
      { company: "lakeside", city: "Chicago", state: "IL", units: 30, supplyQty: 2, stage: "scheduled", daysAgo: 8 },
      { company: "sunshine", city: "Chicago", state: "IL", units: 25, supplyQty: 1, stage: "scheduled", daysAgo: 7 },
      { company: "downtown", city: "Detroit", state: "MI", units: 30, supplyQty: 1, stage: "ready", daysAgo: 4 },
      { company: "riverside", city: "Detroit", state: "MI", units: 20, supplyQty: 0, stage: "ready", daysAgo: 3 },
      { company: "beachside", city: "Columbus", state: "OH", units: 15, supplyQty: 1, stage: "waiting", daysAgo: 1 },
    ],
  },
  {
    slug: "party-supplies-direct",
    name: "Party Supplies Direct",
    region: "West",
    description: "Table covers, balloons, serving trays and disposable tableware for events.",
    products: [
      { name: "Table Cover Pack", slug: "table-cover-pack", category: "Tableware", price: 12.0, bucketCountValue: 1, sku: "PS-TABLECOVER" },
      { name: "Balloon Bundle", slug: "balloon-bundle", category: "Decor", price: 9.5, bucketCountValue: 1, sku: "PS-BALLOONS" },
      { name: "Serving Trays Set", slug: "serving-trays-set", category: "Tableware", price: 16.0, bucketCountValue: 1, sku: "PS-TRAYS" },
      { name: "Plastic Forks Pack", slug: "plastic-forks-pack", category: "Tableware", price: 5.25, bucketCountValue: 0, sku: "PS-FORKS", supply: true },
    ],
    orders: [
      { company: "sunshine", city: "Los Angeles", state: "CA", units: 35, supplyQty: 3, stage: "scheduled", daysAgo: 6 },
      { company: "lakeside", city: "Los Angeles", state: "CA", units: 20, supplyQty: 1, stage: "scheduled", daysAgo: 5 },
      { company: "beachside", city: "Phoenix", state: "AZ", units: 28, supplyQty: 2, stage: "waiting", daysAgo: 2 },
      { company: "downtown", city: "Seattle", state: "WA", units: 50, supplyQty: 5, stage: "delivered", daysAgo: 18 },
    ],
  },
];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function nextUserId() {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function ensureVendor(def) {
  return prisma.marketplaceVendor.upsert({
    where: { slug: def.slug },
    update: { name: def.name, description: def.description, status: "active", updatedAt: new Date() },
    create: { name: def.name, slug: def.slug, description: def.description, status: "active" },
  });
}

async function ensureProducts(vendorId, def) {
  const bySlug = {};
  const categoryIdByName = {};
  let sort = 0;
  for (const p of def.products) {
    if (!categoryIdByName[p.category]) {
      const slug = p.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const cat = await prisma.marketplaceCategory.upsert({
        where: { vendorId_slug: { vendorId, slug } },
        update: { name: p.category, sortOrder: sort, isActive: true, updatedAt: new Date() },
        create: { vendorId, name: p.category, slug, sortOrder: sort, isActive: true },
      });
      categoryIdByName[p.category] = cat.id;
      sort += 1;
    }
    const categoryId = categoryIdByName[p.category];
    const product = await prisma.marketplaceProduct.upsert({
      where: { slug: p.slug },
      update: {
        vendorId, categoryId, name: p.name, sku: p.sku, price: p.price, currency: "USD",
        category: p.category, bucketCountValue: p.bucketCountValue, inventoryCount: 500, stock: 500,
        isActive: true, status: "active", updatedAt: new Date(),
      },
      create: {
        vendorId, categoryId, name: p.name, slug: p.slug, sku: p.sku, price: p.price, currency: "USD",
        category: p.category, bucketCountValue: p.bucketCountValue, inventoryCount: 500, stock: 500,
        isActive: true, status: "active",
      },
    });
    bySlug[p.slug] = { ...product, supply: !!p.supply };
  }
  const unitProduct = def.products.find((p) => !p.supply);
  const supplyProduct = def.products.find((p) => p.supply);
  return {
    bySlug,
    unit: unitProduct ? bySlug[unitProduct.slug] : null,
    supply: supplyProduct ? bySlug[supplyProduct.slug] : null,
  };
}

async function ensureCompanyRoleId() {
  const role = await prisma.role.findFirst({ where: { name: "company" }, select: { id: true } });
  return role?.id ?? null;
}

async function ensureCompany(def, creatorId, companyRoleId) {
  const existing = await prisma.user.findFirst({ where: { email: def.email }, select: { id: true } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name: def.name, type: "company", isActive: true, isEnableLogin: true },
    });
    return existing.id;
  }
  const id = await nextUserId();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.create({
    data: {
      id, name: def.name, email: def.email, password: passwordHash, type: "company", slug: def.slug,
      isEnableLogin: true, isActive: true, creatorId: creatorId ?? null, createdBy: creatorId ?? null,
      emailVerifiedAt: new Date(), createdAt: new Date(),
    },
  });
  if (companyRoleId) {
    const link = await prisma.modelHasRole.findFirst({
      where: { roleId: companyRoleId, modelId: id, modelType: LARAVEL_USER_MORPH_TYPE },
      select: { roleId: true },
    });
    if (!link) {
      await prisma.modelHasRole.create({
        data: { roleId: companyRoleId, modelId: id, modelType: LARAVEL_USER_MORPH_TYPE },
      });
    }
  }
  return id;
}

async function cleanupPreviousDemo(vendorIds) {
  const demoOrders = await prisma.marketplaceOrder.findMany({
    where: { orderNumber: { startsWith: ORDER_PREFIX } },
    select: { id: true },
  });
  if (demoOrders.length) {
    // Cascades: items, order lines, marketplace deliveries (+ their events), delivery_event_orders.
    await prisma.marketplaceOrder.deleteMany({ where: { id: { in: demoOrders.map((o) => o.id) } } });
  }
  await prisma.deliveryEvent.deleteMany({
    where: { vendorId: { in: vendorIds }, deliveryNotes: { contains: EVENT_MARKER } },
  });
  await prisma.deliveryCityQueue.deleteMany({ where: { vendorId: { in: vendorIds } } });
  await prisma.marketplaceDeliveryQueue.deleteMany({ where: { description: { contains: EVENT_MARKER } } });
  console.log(`  cleanup: removed ${demoOrders.length} previous demo order(s) + their deliveries/queues/events`);
}

function buildItems(catalog, units, supplyQty) {
  const items = [];
  const lines = [];
  let subtotal = 0;
  let bucketTotal = 0;

  if (units > 0 && catalog.unit) {
    const unitPrice = Number(catalog.unit.price);
    const total = round2(unitPrice * units);
    subtotal += total;
    bucketTotal += (catalog.unit.bucketCountValue ?? 1) * units;
    items.push({
      productId: catalog.unit.id, productName: catalog.unit.name, quantity: units,
      unitPrice, totalPrice: total, bucketCountValue: catalog.unit.bucketCountValue ?? 1,
    });
    lines.push({
      productId: catalog.unit.id, vendorId: catalog.unit.vendorId, title: catalog.unit.name,
      unitPrice, quantity: units, lineTotal: total,
    });
  }
  if (supplyQty > 0 && catalog.supply) {
    const unitPrice = Number(catalog.supply.price);
    const total = round2(unitPrice * supplyQty);
    subtotal += total;
    items.push({
      productId: catalog.supply.id, productName: catalog.supply.name, quantity: supplyQty,
      unitPrice, totalPrice: total, bucketCountValue: 0,
    });
    lines.push({
      productId: catalog.supply.id, vendorId: catalog.supply.vendorId, title: catalog.supply.name,
      unitPrice, quantity: supplyQty, lineTotal: total,
    });
  }
  return { items, lines, subtotal: round2(subtotal), bucketTotal };
}

function orderStatusesForStage(stage) {
  switch (stage) {
    case "scheduled":
      return { status: "scheduled", orderStatus: "scheduled", deliveryStatus: "scheduled" };
    case "delivered":
      return { status: "delivered", orderStatus: "delivered", deliveryStatus: "delivered" };
    default:
      return { status: "paid", orderStatus: "paid", deliveryStatus: "waiting_for_city_minimum" };
  }
}

function deliveryStatusForStage(stage) {
  switch (stage) {
    case "scheduled":
      return "assigned";
    case "delivered":
      return "delivered";
    case "ready":
      return "queued";
    default:
      return "queued";
  }
}

async function main() {
  console.log("Seeding MULTI-VENDOR Marketplace END-TO-END demo data...");

  const owner = await prisma.user.findFirst({
    where: { type: { in: ["superadmin", "super_admin", "platform"] } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  const companyRoleId = await ensureCompanyRoleId();

  const companyIdByKey = {};
  for (const def of COMPANIES) {
    companyIdByKey[def.key] = await ensureCompany(def, owner?.id ?? null, companyRoleId);
  }
  console.log(`Companies ready: ${COMPANIES.length}`);

  // Vendors + catalogs (upserted).
  const vendorRows = [];
  for (const def of VENDORS) {
    const vendor = await ensureVendor(def);
    const catalog = await ensureProducts(vendor.id, def);
    vendorRows.push({ def, vendor, catalog });
    console.log(`  vendor ready: ${vendor.name} (id=${vendor.id}) - ${def.products.length} products`);
  }

  await cleanupPreviousDemo(vendorRows.map((v) => v.vendor.id));

  let seq = 0;
  for (const { def, vendor, catalog } of vendorRows) {
    // Named delivery queue for this vendor's region (plural Delivery Queues page).
    const namedQueue = await prisma.marketplaceDeliveryQueue.create({
      data: {
        name: `${def.name} - ${def.region} Route`,
        description: `${EVENT_MARKER} Demo delivery queue for ${def.name} (${def.region}).`,
        region: def.region,
        status: "active",
      },
    });

    const createdOrders = [];
    for (const o of def.orders) {
      seq += 1;
      const companyId = companyIdByKey[o.company];
      const { items, lines, subtotal, bucketTotal } = buildItems(catalog, o.units, o.supplyQty);
      const s = orderStatusesForStage(o.stage);
      const createdAt = daysFromNow(-o.daysAgo);
      const orderNumber = `${ORDER_PREFIX}${String(seq).padStart(4, "0")}`;

      const order = await prisma.marketplaceOrder.create({
        data: {
          orderNumber,
          buyerOrganizationId: companyId,
          companyId,
          vendorId: vendor.id,
          placedByUserId: companyId,
          status: s.status,
          orderStatus: s.orderStatus,
          paymentStatus: "paid",
          deliveryStatus: s.deliveryStatus,
          city: o.city,
          state: o.state,
          totalBucketCount: bucketTotal,
          subtotal,
          tax: 0,
          deliveryFee: 0,
          total: subtotal,
          totalAmount: subtotal,
          currency: "USD",
          stripePaymentIntentId: `pi_demo_${orderNumber.toLowerCase()}`,
          notes: "Demo order seeded for marketplace flow walkthrough.",
          createdAt,
          updatedAt: createdAt,
          items: { create: items },
          lines: { create: lines },
        },
      });

      // Per-order delivery linked to the named queue (plural page deliveries).
      const dStage = o.stage;
      const delivery = await prisma.marketplaceDelivery.create({
        data: {
          orderId: order.id,
          queueId: namedQueue.id,
          buyerOrganizationId: companyId,
          status: deliveryStatusForStage(dStage),
          assignedTo: dStage === "scheduled" || dStage === "delivered" ? "Dana Rivera" : null,
          addressLine: `${o.city} Distribution Hub`,
          city: o.city,
          state: o.state,
          country: "USA",
          scheduledAt: dStage === "scheduled" ? daysFromNow(5) : dStage === "delivered" ? daysFromNow(-3) : null,
          deliveredAt: dStage === "delivered" ? daysFromNow(-3) : null,
          createdAt,
          updatedAt: createdAt,
        },
      });
      // Delivery timeline events.
      const events = [{ status: "queued", note: "Order received and queued." }];
      if (dStage === "scheduled" || dStage === "delivered") {
        events.push({ status: "assigned", note: "Assigned to delivery route." });
      }
      if (dStage === "delivered") {
        events.push({ status: "in_transit", note: "Out for delivery." });
        events.push({ status: "delivered", note: "Delivered successfully." });
      }
      await prisma.marketplaceDeliveryEvent.createMany({
        data: events.map((e) => ({ deliveryId: delivery.id, status: e.status, note: e.note, createdAt })),
      });

      createdOrders.push({ ...o, id: order.id, bucketTotal, companyId });
    }

    // City queues + city delivery events (singular Delivery Queue page).
    const byCity = new Map();
    for (const o of createdOrders) {
      const key = `${o.city}|${o.state}`;
      if (!byCity.has(key)) byCity.set(key, []);
      byCity.get(key).push(o);
    }

    for (const [key, orders] of byCity) {
      const [city, state] = key.split("|");
      const bucketTotal = orders.reduce((sum, o) => sum + o.bucketTotal, 0);
      const companyCount = new Set(orders.map((o) => o.companyId.toString())).size;
      const stage = orders[0].stage;
      const scheduled = stage === "scheduled" || stage === "delivered";
      const queueStatus = scheduled
        ? "scheduled"
        : bucketTotal >= REQUIRED_MINIMUM
          ? "ready_to_schedule"
          : "waiting";

      const cityQueue = await prisma.deliveryCityQueue.upsert({
        where: { vendorId_city_state: { vendorId: vendor.id, city, state } },
        update: {
          requiredBucketMinimum: REQUIRED_MINIMUM, currentBucketTotal: bucketTotal,
          companyCount, queueStatus, updatedAt: new Date(),
        },
        create: {
          vendorId: vendor.id, city, state, requiredBucketMinimum: REQUIRED_MINIMUM,
          currentBucketTotal: bucketTotal, companyCount, queueStatus,
        },
      });

      if (scheduled) {
        const past = stage === "delivered";
        const deliveryDate = daysFromNow(past ? -3 : 5);
        const event = await prisma.deliveryEvent.create({
          data: {
            vendorId: vendor.id,
            cityQueueId: cityQueue.id,
            city,
            state,
            deliveryDate,
            startTime: "09:00",
            endTime: "12:00",
            deliveryAddress: `${city} Central Distribution Hub, ${state}`,
            deliveryNotes: `${EVENT_MARKER} Demo delivery run for ${city}, ${state}.`,
            driverName: past ? "Marcus Lee" : "Dana Rivera",
            driverPhone: "+1 555 0100",
            status: past ? "completed" : "scheduled",
          },
        });
        await prisma.deliveryEventOrder.createMany({
          data: orders.map((o) => ({
            deliveryEventId: event.id,
            orderId: o.id,
            companyId: o.companyId,
            status: past ? "delivered" : "pending",
          })),
          skipDuplicates: true,
        });
      }
    }

    console.log(`  ${def.name}: ${def.orders.length} orders, ${byCity.size} city queue(s), 1 named queue`);
  }

  console.log("\nDone. Multi-vendor marketplace demo seeded:");
  console.log(`  Vendors: ${VENDORS.length} (each with products, orders, city queues + a named delivery queue)`);
  console.log("  City queue states present: waiting, ready_to_schedule, scheduled, delivered (history)");
  console.log("  Named delivery queues populated (plural Delivery Queues page) with per-order deliveries.");
  console.log(`\nDemo company logins (password: ${DEMO_PASSWORD}):`);
  for (const c of COMPANIES) console.log(`  ${c.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
