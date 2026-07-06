# PRD: Admin Dashboard Migration to Next.js

**Project:** Paper Flight Dash  
**Project ID:** 820d5217-892d-42fc-b0ca-c096d74836d0  
**Type:** Frontend migration  
**Audience:** ADMIN (company admin) user role  

## Overview

Migrate the admin (company) dashboard experience from the existing Laravel/Inertia stack into the Next.js application. The admin dashboard is the interface used by company administrators (non-superadmin users) and includes Dashboard home, User Management, Proposals, Sales/Purchase, Media, Messenger, Helpdesk, Plan/Subscription, and Settings.

## Current State

- **Next.js** already provides: Dashboard (simple welcome), Helpdesk (tickets + categories), Subscription (plans, coupons, bank transfer, orders), Settings, Media Library. Unauthenticated or missing routes fall back to a catch-all placeholder (`/app/[...path]`).
- **Laravel/Inertia** holds the full admin experience: roles, users, sales proposals, sales invoices/returns, purchase invoices/returns, warehouses, transfers, messenger, and the above areas with full CRUD and workflows.

## Goals

1. Move all admin-facing UI and flows into Next.js.
2. Keep feature parity with Laravel (permissions, workflows, validations).
3. Reuse or create Next.js API routes that proxy or replace Laravel endpoints where applicable.
4. Organize work section-by-section for incremental delivery.

## Out of Scope (for this PRD)

- Superadmin-only flows (already partially in Next.js).
- POS, HRM, CRM, Project, Appointment module dashboards (separate migration efforts).
- Backend API migration (Laravel APIs can be consumed by Next.js until a separate API migration).

---

## Section 1: Dashboard (Admin Home)

**Description:** Admin dashboard landing page after login.  
**Laravel:** `HomeController::Dashboard`, `resources/js/pages/dashboard.tsx`, optional `DashboardOverview` for company type.  
**Next.js:** `app/dashboard/page.tsx` currently shows a welcome card for non-superadmin; no widgets or quick links.

**Tasks:**
- [ ] **1.1** Define admin dashboard data needs (stats, quick links, recent activity) and API or server data loading.
- [ ] **1.2** Implement admin dashboard layout with optional stat cards and shortcuts matching company menu (e.g. Users, Proposals, Invoices, Helpdesk).
- [ ] **1.3** Add i18n and permission-aware visibility for dashboard widgets.

**Acceptance:** Admin users see a dedicated dashboard home (not just welcome) with relevant shortcuts and optional stats.

---

## Section 2: User Management (Roles & Users)

**Description:** Roles CRUD and Users CRUD, including change password, impersonation, login history.  
**Laravel:** `RoleController`, `UserController`; routes: `roles` (resource), `users` (resource), `users/change-password`, `users/impersonate`, `users/login/history`, etc.  
**Next.js:** No `/roles` or `/users` pages; catch-all shows placeholder.

**Tasks:**
- [ ] **2.1** Roles: Next.js pages for list, create, edit; API routes for roles CRUD (or proxy to Laravel).
- [ ] **2.2** Roles: Role-permission matrix UI and save logic.
- [ ] **2.3** Users: Next.js pages for list, create, edit, show; API routes for users CRUD.
- [ ] **2.4** Users: Change-password flow and impersonation/leave-impersonation.
- [ ] **2.5** Users: Login history (and optional all-logs) page.
- [ ] **2.6** Permission checks on all User Management routes and components.

**Acceptance:** Admin can manage roles and users with full parity to Laravel (permissions, validations, impersonation).

---

## Section 3: Proposal (Sales Proposals)

**Description:** Sales proposals – list, create, edit, view, print.  
**Laravel:** `SalesProposalController`; `SalesProposals/Index`, `Create`, `Edit`, `View`, `Print`.  
**Next.js:** No `/sales-proposals`; catch-all placeholder.

**Tasks:**
- [ ] **3.1** Sales proposals list page with filters, pagination, and actions (view, edit, print).
- [ ] **3.2** Create proposal page and form (line items, totals, client, etc.).
- [ ] **3.3** Edit proposal page reusing form logic.
- [ ] **3.4** View proposal page (read-only) with print action.
- [ ] **3.5** API routes for proposals CRUD and print (or proxy to Laravel).

**Acceptance:** Admin can list, create, edit, view, and print sales proposals.

---

## Section 4: Sales Invoice & Sales Returns

**Description:** Sales invoices (CRUD, post, print) and sales returns (list, create, show, approve, complete).  
**Laravel:** `SalesInvoiceController`, `SalesReturnController`; warehouse products and services endpoints.  
**Next.js:** No `/sales-invoices` or `/sales-returns`.

**Tasks:**
- [ ] **4.1** Sales invoices list with filters, post action, and print.
- [ ] **4.2** Sales invoice create/edit form (warehouse, products, services, totals).
- [ ] **4.3** Sales invoice view and print.
- [ ] **4.4** Sales returns list and create flow.
- [ ] **4.5** Sales return show with approve/complete actions.
- [ ] **4.6** API routes for sales invoices and returns (or proxy to Laravel).

**Acceptance:** Admin can manage sales invoices and returns with post/print/approve/complete workflows.

---

## Section 5: Purchase (Invoices, Returns, Warehouses, Transfers)

**Description:** Purchase invoices (CRUD, post, print), purchase returns, warehouses (CRUD), transfers (create, list, show, delete).  
**Laravel:** `PurchaseInvoiceController`, `WarehouseController`, `TransferController`; purchase returns in packages.  
**Next.js:** No `/purchase-invoices`, `/purchase-returns`, `/warehouses`, `/transfers`.

**Tasks:**
- [ ] **5.1** Purchase invoices list, create, edit, view, post, print.
- [ ] **5.2** Purchase returns list, create, view, and any approval flow.
- [ ] **5.3** Warehouses CRUD pages and API.
- [ ] **5.4** Transfers list, create, show, delete (no edit/update per Laravel).
- [ ] **5.5** API routes for purchase, warehouses, and transfers (or proxy to Laravel).

**Acceptance:** Admin can manage purchase invoices, returns, warehouses, and stock transfers.

---

## Section 6: Media Library

**Description:** Upload, browse, and manage media assets.  
**Laravel:** `MediaController`; `media-library` page.  
**Next.js:** `app/media-library/page.tsx` exists.

**Tasks:**
- [ ] **6.1** Verify Media Library Next.js page has full parity (upload, list, delete, filters, folder/organization if applicable).
- [ ] **6.2** Fix any missing API or upload flow and ensure permissions.

**Acceptance:** Admin can upload, view, and manage media with same capabilities as Laravel.

---

## Section 7: Messenger

**Description:** In-app messenger for internal communication.  
**Laravel:** `MessengerController`; `messenger/index` and related views.  
**Next.js:** No `/messenger`; catch-all placeholder.

**Tasks:**
- [ ] **7.1** Messenger layout (conversation list + thread view).
- [ ] **7.2** List conversations and load thread messages via API.
- [ ] **7.3** Send message and real-time or polling updates.
- [ ] **7.4** New conversation / user selector if applicable.
- [ ] **7.5** API routes or proxy for messenger endpoints.

**Acceptance:** Admin can use the messenger with conversation list and messaging parity.

---

## Section 8: Helpdesk

**Description:** Helpdesk tickets and categories.  
**Laravel:** `HelpdeskCategoryController`, `HelpdeskTicketController`, `HelpdeskReplyController`.  
**Next.js:** `helpdesk-tickets`, `helpdesk-categories` pages and APIs exist.

**Tasks:**
- [ ] **8.1** Verify ticket list, create, view, reply, and category CRUD parity.
- [ ] **8.2** Ensure permission checks (manage-helpdesk-tickets, manage-helpdesk-categories) and any company-scoping.

**Acceptance:** Helpdesk in Next.js matches Laravel behavior and permissions.

---

## Section 9: Plan / Subscription (Plans, Coupons, Bank Transfer, Orders)

**Description:** Subscription plans, coupons, bank transfer requests, orders.  
**Laravel:** `PlanController`, `CouponController`, `BankTransferPaymentController`, `OrderController`.  
**Next.js:** `plans`, `coupons`, `bank-transfer`, `orders` pages and APIs exist.

**Tasks:**
- [ ] **9.1** Verify plans CRUD, subscribe, start-trial, assign-free, apply-coupon flows.
- [ ] **9.2** Verify coupons CRUD and usage.
- [ ] **9.3** Verify bank transfer list, approve, reject, update.
- [ ] **9.4** Verify orders list and show.
- [ ] **9.5** Add any missing company-scoped or permission checks.

**Acceptance:** Plan, coupons, bank transfer, and orders in Next.js have full parity for admin.

---

## Section 10: Settings

**Description:** Company/brand, system, currency, cache, SEO, storage, email, Pusher, bank-transfer settings, etc.  
**Laravel:** `SettingController`; multiple POST endpoints per area.  
**Next.js:** `app/settings/page.tsx` and `settings-page` component exist.

**Tasks:**
- [ ] **10.1** Audit all Laravel settings tabs (brand, company, system, currency, cache, cookie, SEO, storage, email, pusher, bank-transfer, email-notification).
- [ ] **10.2** Ensure each tab has Next.js UI and API (or proxy) and correct permissions.

**Acceptance:** Admin can change all settings available in Laravel from Next.js.

---

## Implementation Notes

- **API strategy:** Prefer Next.js API routes that proxy to existing Laravel APIs (same backend) to avoid duplicate business logic. Replace with direct DB/Prisma only where a dedicated API migration is done.
- **Permissions:** Use existing cookie/session or JWT for auth; enforce `manage-*` permissions in Next.js middleware and page components.
- **Menu:** `company-menu.ts` already defines sidebar links; add new routes so they render real pages instead of the catch-all.
- **i18n:** Use the same keys as Laravel where possible; add Next.js i18n for new copy.

## CodeSpring Sync

- **Feature (mindmap):** e.g. "Admin Dashboard Migration" with children per section (Dashboard, User Management, Proposal, Sales, Purchase, Media, Messenger, Helpdesk, Plan, Settings).
- **Tasks:** Create one task per checkbox above (or group per section) in CodeSpring with status `todo`, and link to the corresponding feature/section.
- **PRD resource:** This document can be synced via `sync_prd` when the CodeSpring API is available.
