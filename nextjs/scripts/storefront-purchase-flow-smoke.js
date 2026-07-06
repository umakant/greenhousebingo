/* eslint-disable no-console */
/**
 * End-to-end smoke: public cart → checkout prepare → place order → test payment confirm (dev).
 *
 * Prerequisites:
 * - `npm run dev` (default http://localhost:5000)
 * - Domain `localhost` → website (see `scripts/seed-storefront-commerce-demo.js`)
 * - At least one published storefront product for that org
 *
 * Usage:
 *   node ./scripts/storefront-purchase-flow-smoke.js
 *   STOREFRONT_SMOKE_BASE=http://127.0.0.1:5000 node ./scripts/storefront-purchase-flow-smoke.js
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const BASE = (process.env.STOREFRONT_SMOKE_BASE || "http://localhost:5000").replace(/\/$/, "");

function mergeCookieJar(jar, res) {
  const out = { ...jar };
  const list = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  if (Array.isArray(list) && list.length) {
    for (const c of list) {
      const first = c.split(";")[0];
      const eq = first.indexOf("=");
      if (eq === -1) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (name) out[name] = value;
    }
    return out;
  }
  const sc = res.headers.get("set-cookie");
  if (!sc) return out;
  for (const part of sc.split(/,(?=\s*[A-Za-z0-9_-]+=)/)) {
    const first = part.split(";")[0];
    const eq = first.indexOf("=");
    if (eq === -1) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name) out[name] = value;
  }
  return out;
}

function cookieHeader(jar) {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function api(path, { method = "GET", body, cookieJar } = {}) {
  const headers = {
    "content-type": "application/json",
    ...(Object.keys(cookieJar || {}).length ? { cookie: cookieHeader(cookieJar) } : {}),
  };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { res, json, text };
}

async function main() {
  console.log(`[storefront-smoke] Base URL: ${BASE}`);
  if (process.env.STRIPE_SECRET_KEY?.trim()) {
    console.warn(
      "[storefront-smoke] STRIPE_SECRET_KEY is set — checkout will return a PaymentIntent; this script only auto-completes the mock (no Stripe) path.",
    );
  }

  const domain = await prisma.domain.findFirst({
    where: { hostname: "localhost", status: "active" },
    include: { website: { select: { id: true, organizationId: true } } },
  });
  if (!domain?.website) {
    console.error("[storefront-smoke] No active domain `localhost`. Run: npm run db:seed:storefront-commerce");
    process.exit(1);
  }
  const { organizationId } = domain.website;

  const now = new Date();
  const product = await prisma.posProduct.findFirst({
    where: {
      organizationId,
      storefrontPublished: true,
      isActive: true,
      OR: [{ storefrontPublishAt: null }, { storefrontPublishAt: { lte: now } }],
    },
    orderBy: { id: "asc" },
    select: { id: true, name: true, price: true },
  });
  if (!product) {
    console.error("[storefront-smoke] No published storefront product for this org. Seed commerce demo + POS demo.");
    process.exit(1);
  }
  console.log(`[storefront-smoke] Using product #${product.id} (${product.name}) @ $${Number(product.price)}`);

  let jar = {};

  const add = await api("/api/storefront/public/cart", {
    method: "POST",
    cookieJar: jar,
    body: {
      productId: product.id.toString(),
      variantKey: "",
      quantity: 1,
    },
  });
  jar = mergeCookieJar(jar, add.res);
  if (!add.res.ok || !add.json?.ok) {
    console.error("[storefront-smoke] Add to cart failed:", add.res.status, add.text?.slice(0, 400));
    process.exit(1);
  }
  console.log("[storefront-smoke] Cart line added, cookie:", jar.sf_cart_id ? "sf_cart_id=…" : "(none)");

  const prep = await api("/api/storefront/public/checkout/prepare", {
    method: "POST",
    cookieJar: jar,
    body: {
      shippingMethodKey: "standard",
      couponCode: "",
      shippingCountry: "US",
      shippingRegion: "PA",
    },
  });
  jar = mergeCookieJar(jar, prep.res);
  if (!prep.res.ok || !prep.json?.ok || !prep.json.checkoutSessionId) {
    console.error("[storefront-smoke] Prepare failed:", prep.res.status, prep.text?.slice(0, 500));
    process.exit(1);
  }
  const checkoutSessionId = prep.json.checkoutSessionId;
  console.log("[storefront-smoke] Checkout session:", checkoutSessionId);

  const ship = {
    line1: "123 Test St",
    city: "Philadelphia",
    region: "PA",
    postal: "19103",
    country: "US",
  };

  const co = await api("/api/storefront/public/checkout", {
    method: "POST",
    cookieJar: jar,
    body: {
      customerEmail: "storefront-smoke@example.com",
      customerFirstName: "Smoke",
      customerLastName: "Test",
      shippingAddress: ship,
      billingAddress: ship,
      checkoutSessionId,
    },
  });
  jar = mergeCookieJar(jar, co.res);
  if (!co.res.ok || !co.json?.ok) {
    console.error("[storefront-smoke] Checkout failed:", co.res.status, co.text?.slice(0, 600));
    process.exit(1);
  }

  const { orderId, orderNumber, mockPayment, clientSecret } = co.json;
  console.log("[storefront-smoke] Order created:", orderNumber, "id=", orderId, "mockPayment=", mockPayment);

  if (mockPayment && orderId) {
    const conf = await api("/api/storefront/public/checkout/confirm-test", {
      method: "POST",
      cookieJar: jar,
      body: { orderId },
    });
    if (!conf.res.ok || !conf.json?.ok) {
      console.error("[storefront-smoke] confirm-test failed:", conf.res.status, conf.text?.slice(0, 500));
      process.exit(1);
    }
    const paid = conf.json.order;
    console.log("[storefront-smoke] Test payment confirmed. Order status:", paid?.status, "payment:", paid?.paymentStatus);
  } else if (clientSecret) {
    console.log(
      "[storefront-smoke] Stripe PaymentIntent issued — finish in UI: /shop/checkout with card 4242424242424242 (any future exp, any CVC).",
    );
  }

  if (orderId) {
    const row = await prisma.storefrontOrder.findFirst({
      where: { id: BigInt(orderId) },
      select: { status: true, paymentStatus: true, total: true, orderNumber: true },
    });
    console.log("[storefront-smoke] DB snapshot:", row);
  }

  console.log("[storefront-smoke] OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
