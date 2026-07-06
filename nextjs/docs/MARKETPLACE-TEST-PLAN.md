# Marketplace Module — Test Plan

This document describes the test strategy for the Water Ice Express Marketplace
module and maps each required flow to the automated tests that cover it.

## Framework & conventions

- **Runner:** [Vitest](https://vitest.dev) (`npm run test` → `vitest run`,
  `npm run test:watch` for the watcher).
- **Config:** `vitest.config.ts` — `environment: "node"`, includes
  `src/**/*.test.ts`, `@` aliased to `src`.
- **Style (matches existing suite):**
  - Pure functions are imported and asserted directly.
  - Anything that touches the database mocks `@/lib/prisma`; modules guarded by
    `import "server-only"` mock `server-only` to an empty module.
  - API route handlers are exercised by mocking their `@/lib/*` collaborators
    (guards, services, Stripe) and invoking the exported `GET`/`POST` with a
    lightweight request object — no live HTTP server or database is required.
- **UI tests:** the project has **no DOM/component test environment**
  (node environment, no `jsdom` / `@testing-library/react`). The existing
  "UI" tests in the repo are *contract* tests (e.g.
  `*-sections.contract.test.ts`) that assert serialized data/shape rather than
  rendered markup. We follow the same approach: the UI ticket-category contract
  is asserted against the server's allowed list rather than rendering React.

## How to run

```bash
cd nextjs
npm run test                       # all tests
npx vitest run src/lib/marketplace # only the marketplace lib unit tests
npx vitest run -t "checkout"       # by test name
```

## Coverage matrix

| # | Required flow | Test file(s) | Type |
|---|---------------|--------------|------|
| 1 | **Permissions** — no-permission blocked, marketplace-enabled company allowed, admin `delivery_queue` permission, unauthorized blocked | `src/lib/marketplace-company-api-guard.test.ts`, `src/lib/marketplace-admin-api-guard.test.ts` | unit |
| 2 | **Product browsing** — vendor card / products visible, inactive products hidden | `src/app/api/marketplace/shop/catalog/route.test.ts`, `src/lib/marketplace-cart.test.ts` | integration + unit |
| 3 | **Cart validation** — subtotal, bucket count, blocked < 6, allowed ≥ 6 | `src/lib/marketplace-pricing.test.ts`, `src/lib/marketplace-cart.test.ts` | unit |
| 4 | **Checkout** — Stripe payment, order + items created, status `paid`, delivery `waiting_for_city_minimum` | `src/app/api/marketplace/checkout/route.test.ts`, `src/lib/marketplace-service-serialize.test.ts` | integration + unit |
| 5 | **Delivery queue** — first city creates queue, more orders increment, separate cities separate queues, `ready_to_schedule` at minimum (50) | `src/lib/marketplace-delivery-queue.test.ts` | unit |
| 6 | **Delivery scheduling** — event created, orders attached, orders → scheduled, queue → scheduled, companies notified | `src/app/api/marketplace/admin/delivery-queue/[cityState]/schedule/route.test.ts` | integration |
| 7 | **Partner tracking** — referred orders store attribution, commission only after payment | `src/lib/partner-marketplace-commission.test.ts` | unit |
| 8 | **Company dashboard** — sees paid order pre-schedule, sees scheduled delivery after admin schedules | `src/lib/marketplace-service-serialize.test.ts` (serialized status surface), `schedule/route.test.ts` (transition) | unit + integration |

Supporting: `src/lib/marketplace-support.test.ts` (order-issue support ticket
categories — the UI/server contract).

## Flow-by-flow detail

### 1. Permissions
- `guardMarketplaceCompany`: rejects missing cookies (401); rejects when the user
  lacks `marketplace.view`/`marketplace.manage` (403); rejects when the
  `marketplace` add-on is not activated (403); rejects when no org context (403);
  allows a superadmin and a properly-permissioned company user.
- `guardMarketplaceAdmin`: rejects non-superadmin roles (403); rejects superadmin
  missing the section permission (403); allows superadmin holding
  `marketplace.delivery_queue` / `marketplace.manage` / `*`.

### 2. Product browsing
- Catalog route returns active products from active vendors and the route's
  `where` filter is asserted to scope `status: "active"` + `vendor.status:
  "active"` (inactive products and inactive vendors are excluded).
- Guard failure short-circuits to the guard's `403` response.
- `validateCart` returns "no longer available" when only inactive products are
  requested (the active-only `where` yields no rows).

### 3. Cart validation
- `computeTotals`: subtotal = Σ(unitPrice × qty); bucket count = Σ(bucket × qty);
  tax = subtotal × rate; delivery fee only when subtotal > 0; rounding to cents.
- `validateCart`: computes subtotal/buckets; `meetsMinimum` is `false` below the
  configured minimum (6) and `true` at/over it; rejects multi-vendor carts and
  empty carts.

### 4. Checkout
- Under 6 buckets → `400` and no order created.
- At/over minimum with payment collected → `MarketplaceOrder` created with
  `status: "paid"`, `orderStatus: "paid"`, `deliveryStatus:
  "waiting_for_city_minimum"`, and `items.create` populated.
- The serialized order exposes the status surface the dashboard reads.

### 5. Delivery queue
- `normalizeCityState`: `("Jacksonville","FL")` and `("  jacksonville ",
  "florida")` collapse to the same `{ city: "Jacksonville", state: "FL" }`.
- `encode`/`decode` round-trip a `vendorId~city~state` segment.
- `updateDeliveryCityQueue`: first order **creates** the queue; an existing queue
  **increments** the bucket total; the status flips to `ready_to_schedule` once
  the required minimum (default **50**) is reached (`becameReady` is true only on
  the transition); different cities use a different unique key.
- `getCityQueueProgress` returns zeroed defaults when the queue is absent and a
  clamped percentage when present.
- `getOrdersForCityQueue` filters vendor orders down to the normalized city/state.

### 6. Delivery scheduling
- `POST .../schedule` creates a `DeliveryEvent`, attaches every city order via
  `deliveryEventOrder.createMany`, updates the orders to
  `status/orderStatus/deliveryStatus = scheduled`, flips the queue to
  `scheduled`, and fires a "delivery scheduled" notification per unique buyer.
- Empty city queue → `400`.

### 7. Partner tracking
- `finalizePartnerMarketplaceCommission`: no-op when the order has no attributed
  partner; no-op for non-positive amounts (paid-only / positive guard); no-op
  when the resolved rule is `none`/0; creates a `pending` commission with
  `sourceType: "marketplace"` for a percentage rule (amount = total × rate%) and
  a flat rule (amount = min(flat, total)); is idempotent on the `mp:`-prefixed
  `orderRef`.

### 8. Company dashboard
- `serializeOrderV2` surfaces `paymentStatus`, `orderStatus`, `deliveryStatus`
  and partner attribution that the company order pages render — verified for the
  paid-but-unscheduled state and the scheduled state.
- The scheduling integration test verifies the actual paid → scheduled
  transition that the dashboard reflects.
