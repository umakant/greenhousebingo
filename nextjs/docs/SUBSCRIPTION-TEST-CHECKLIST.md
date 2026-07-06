# Subscription Section – Test Checklist

Use this checklist to manually verify the subscription settings page, plans, and entire subscription section. Log in as a **superadmin** user with `manage-plans`, `manage-coupons`, `manage-bank-transfer-requests`, and `manage-orders` permissions.

---

## 1. Subscription Setting (Plans) – `/plans`

### Navigation
- [ ] Sidebar: **Subscription** → **Subscription Setting** opens `/plans`.
- [ ] Breadcrumb shows: **Dashboard > Subscription Setting**.
- [ ] Page title: **Subscription Setting**.
- [ ] Blue **+** button in header links to **Create Plan** (`/plans/new`) when user has `create-plans`.

### Subscription type tabs
- [ ] **Pre Package Subscription** (default): shows plan cards and Features & Add-Ons matrix.
- [ ] **Usage Subscription**: shows single Custom Plan card (if one exists), usage pricing (Package / Per User / Per Storage), and **Active Add-Ons** list with search.

### Billing cycle
- [ ] **Monthly** (default): plan cards show monthly price (e.g. $25/mo).
- [ ] **Yearly**: plan cards show yearly price; Usage view shows yearly package/per-user/per-storage.

### Plan cards (Pre Package)
- [ ] Each plan shows: name, description, price (or “Free Forever”), users count, storage, trial if enabled.
- [ ] Plan with most orders shows **Most Popular** badge and highlighted border.
- [ ] **Three-dot menu** (superadmin with edit/delete): **Edit** → `/plans/{id}/edit`, **Delete** → opens confirmation modal (not browser `confirm`).
- [ ] Delete confirmation: **Cancel** closes; **Delete** removes plan and refreshes list.

### Features & Add-Ons matrix (Pre Package)
- [ ] Left column: **Features & Add-Ons** with list of add-ons (all add-ons when `?all=1`).
- [ ] Per-plan columns: **X/Y Enabled** with checkmarks (enabled) and crosses (disabled) for each add-on.

### Usage Subscription tab
- [ ] Custom plan card shows name, description, **Edit Pricing** button (superadmin + edit).
- [ ] Three pricing boxes: **Monthly/Yearly Package**, **Per User**, **Per Storage** (respect billing toggle).
- [ ] **Active Add-Ons** section: search input filters list live; each add-on shows name, price, edit (pencil) for superadmin.

### Edit Plan Pricing (from plan card ⋮ or Usage “Edit Pricing”)
- [ ] Dialog: Package price (monthly/yearly); if custom plan, also Per User and Per Storage (monthly/yearly).
- [ ] **Cancel** / **Save**; Save updates and refreshes data.

### Edit Add-On Price (Usage tab, pencil on add-on)
- [ ] Dialog: Add-On Name, Image (file), Monthly Price, Yearly Price.
- [ ] **Cancel** / **Save**; Save calls `PATCH /api/add-ons/{module}` and refreshes.

---

## 2. Create Plan – `/plans/new`

- [ ] Breadcrumb: **Subscription Setting > Create Plan**.
- [ ] **Plan Information**: Plan Name *, Max Users, Storage Limit (GB), Description.
- [ ] **Quick Settings**: Active, Trial, Free toggles.
- [ ] If **Trial** on: **Trial Days** input.
- [ ] If not **Free**: **Pricing** (Monthly $, Yearly $).
- [ ] **Add-Ons**: search, Check All / Uncheck All, checkboxes per add-on (all add-ons via `?all=1`).
- [ ] **Create** → POST `/api/plans` → redirect to `/plans` and toast.
- [ ] **Cancel** → back.

---

## 3. Edit Plan – `/plans/[id]/edit`

- [ ] Breadcrumb: **Plans > Edit** (or **Subscription Setting > Edit**).
- [ ] Form pre-filled from `GET /api/plans/[id]` (name, users, storage, description, pricing, trial, modules).
- [ ] **Update** → PATCH `/api/plans/[id]` → redirect to `/plans` and toast.
- [ ] **Delete** → DELETE → redirect to `/plans` and toast.
- [ ] **Cancel** → back.

---

## 4. Coupons – `/coupons`

- [ ] Sidebar: **Subscription** → **Coupons** (requires `manage-coupons`).
- [ ] Page loads; list of coupons with filters (name, code, type, status), pagination, create/edit/delete as per permissions.

---

## 5. Bank Transfer Requests – `/bank-transfer`

- [ ] Sidebar: **Subscription** → **Bank Transfer Requests** (requires `manage-bank-transfer-requests`).
- [ ] Page loads; list of requests with filters and approve/reject/delete as per permissions.

---

## 6. Orders – `/orders`

- [ ] Sidebar: **Subscription** → **Orders** (requires `manage-orders`; superadmin only for page access).
- [ ] Page loads; list of orders with search and pagination.

---

## 7. API behaviour (without auth)

- [ ] `GET /api/plans` → **403** when not logged in.
- [ ] `GET /api/add-ons` and `GET /api/add-ons?all=1` → **403** when not logged in.

---

## Related

- **CMS / Landing Page:** See [CMS-LANDING-PAGE-TEST-CHECKLIST.md](./CMS-LANDING-PAGE-TEST-CHECKLIST.md) for testing the CMS section and all Landing Page Settings tabs and their reflection on the frontend.

---

## Fixes applied in this pass

1. **Subscription Setting**: Fetch add-ons with `?all=1` so the matrix shows all add-ons (not only enabled).
2. **Plan form (create/edit)**: Fetch add-ons with `?all=1` so superadmin can assign any add-on to a plan.
3. **Delete plan**: Replaced native `confirm()` with a **Dialog** (Cancel / Delete) for consistency with the rest of the app.
