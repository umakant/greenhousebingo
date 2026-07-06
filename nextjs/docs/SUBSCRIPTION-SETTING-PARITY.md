# Subscription Setting – Laravel parity (companies / membership)

This doc describes how the Next.js Subscription Setting aligns with the Laravel subscription setup for companies and membership.

## Page and layout

- **Route:** `/plans` (Setup Subscription Plan)
- **Breadcrumbs:** Dashboard → Subscription Setting (matches Laravel)
- **Title:** Subscription Setting
- **Actions:** Create plan button (when user has `create-plans`), links to `/plans/new`

## Tabs and filters

- **Pre Package Subscription** – Fixed plans (created by superadmin, `custom_plan = false`). Shows plan cards and Features & Add-Ons matrix.
- **Usage Subscription** – Custom/usage plans (`custom_plan = true`). Shows one custom plan with package / per-user / per-storage pricing and add-ons list.
- **Monthly / Yearly** – Toggle for pricing display (monthly vs yearly).

## Plans visibility (companies vs superadmin)

- **Superadmin:** Sees all plans (default + custom from any creator).
- **Company / company_admin:** Sees:
  - All **default** (pre-package) plans: `custom_plan = false`
  - **Own custom** plans: `created_by = current user id`

So companies see the same default plans as in Laravel, plus only the custom plans they created.

## Creating plans

- **Superadmin:** Can create **pre-package** plans (`custom_plan = false`). Shown under “Pre Package Subscription”.
- **Company / company_admin:** Can create **custom (usage)** plans (`custom_plan = true`, `created_by = current user id`). Shown under “Usage Subscription”.

Company users need the `create-plans` permission. The backend sets `custom_plan` and `created_by` based on role (same idea as Laravel).

## Plan cards (Pre Package)

- Plan name, description
- Price (monthly or yearly from toggle)
- Free plan: “Free” / “Forever”
- Features: users count, storage, trial (e.g. “14d trial”)
- “Most Popular” badge on the plan with the highest `orders_count` (successful orders)
- Edit / Delete (for superadmin with `edit-plans` / `delete-plans`)

## Features & Add-Ons matrix

- Left column: “Features & Add-Ons” with list of add-on names (from `/api/add-ons?all=1`).
- One column per plan with “X/Y Enabled” and check (enabled) / cross (disabled) per add-on, based on `plan.modules` (array of module codes).

## Usage Subscription (custom plan)

- Single custom plan card when the company has a custom plan.
- Shows: package price, per-user price, per-storage price (monthly or yearly).
- “Active Add-Ons” list with optional search.
- Edit Pricing (for superadmin) opens dialog to edit package/per-user/per-storage prices.

## APIs

- **GET /api/plans** – Returns plans (filtered by role as above). Each plan includes `orders_count` (successful orders) for “Most Popular”.
- **POST /api/plans** – Create plan. Superadmin → pre-package; company → custom with `created_by`.
- **PATCH /api/plans/[id]** – Update plan (name, modules, pricing, etc. by plan type and permission).
- **DELETE /api/plans/[id]** – Delete plan (e.g. blocked in Laravel when a company is subscribed; same rule can be enforced in Next.js).
- **GET /api/add-ons?all=1** – All add-ons for the matrix and forms.

## Permissions

- `manage-plans` – Access Subscription Setting and list plans.
- `create-plans` – Create plan (pre-package for superadmin, custom for company).
- `edit-plans` – Edit plan (link to edit page, edit pricing dialog).
- `delete-plans` – Delete plan (with guard when plan has active subscriptions).

With these in place, the Next.js Subscription Setting mirrors the Laravel behaviour for companies and membership setup.
