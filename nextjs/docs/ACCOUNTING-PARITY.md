# Accounting Module: Laravel vs Next.js Parity

This document compares the Laravel Account package (`packages/workdo/Account`) with the Next.js implementation.

## Route & Feature Comparison

| Section | Laravel Routes | Laravel Features | Next.js Status |
|--------|----------------|------------------|-----------------|
| **Dashboard** | `GET /account` | Dashboard with KPIs, charts, recent activity | ✅ Implemented (`/account`, AccountDashboard) |
| **Customers** | Resource: index, create, store, edit, update, destroy, show | List, create, edit, delete, search, pagination | ✅ Implemented (`/account/customers`, API list/create/get/patch/delete) |
| **Vendors** | Resource: index, create, store, edit, update, destroy, show | List, create, edit, delete, search, pagination | ✅ Implemented (`/account/vendors`, full CRUD API) |
| **Bank Accounts** | index, store, edit, update, destroy, api/list | List, create, edit, delete, filter (account_number, bank_name, account_type, is_active), sort, link to GL account | 🔶 API + list UI added; create/edit forms optional |
| **Bank Transactions** | index, markReconciled | List transactions, mark as reconciled | 📋 Placeholder; API stub returns [] |
| **Bank Transfers** | index, store, update, destroy, process | List, create, edit, delete, process transfer | 📋 Placeholder; API stub returns [] |
| **Chart of Accounts** | index, store, show, edit, update, destroy | Tree/list, create, edit, delete, opening/current balance | 🔶 API + list UI added |
| **Account Types (Setup)** | index, store, update, destroy | List types, create, update, delete (system setup) | 📋 Placeholder; API stub returns [] |
| **Vendor Payments** | index, store, destroy, getOutstandingInvoices, updateStatus | List, create, delete, outstanding invoices by vendor, status update | 📋 Placeholder; API stub returns [] |
| **Customer Payments** | index, store, destroy, getOutstandingInvoices, updateStatus | List, create, delete, outstanding invoices, status update | 📋 Placeholder; API stub returns [] |
| **Debit Notes** | index, approve, destroy, show | List, approve, delete, show detail | 📋 Placeholder; API stub returns [] |
| **Credit Notes** | index, approve, destroy, show | List, approve, delete, show detail | 📋 Placeholder; API stub returns [] |
| **Revenue Categories** | index, store, edit, update, destroy | CRUD for revenue categories | 📋 Placeholder |
| **Expense Categories** | index, store, edit, update, destroy | CRUD for expense categories | 📋 Placeholder |
| **Revenues** | index, store, show, update, destroy, approve, post | List, create, view, edit, delete, approve, post | 📋 Placeholder; API stub returns [] |
| **Expenses** | index, store, show, update, destroy, approve, post | List, create, view, edit, delete, approve, post | 📋 Placeholder; API stub returns [] |
| **Reports** | index, invoice-aging, bill-aging, tax-summary, customer-balance, vendor-balance, customer-detail, vendor-detail (+ print) | Multiple report types with print | 📋 Placeholder; reports index page only |

## Permissions (Laravel vs Next.js)

- Laravel uses `PlanModuleCheck:Account` middleware and per-action abilities (e.g. `manage-bank-accounts`, `create-bank-accounts`).
- Next.js uses `hasAccountPermission(perms, "manage-*")` so that `manage-account` or the specific permission grants access. Create/edit/delete use specific permissions where applicable.

## Database Tables (Laravel Migrations)

The Laravel Account package creates (among others):

- `bank_accounts`, `chart_of_accounts`, `account_types`, `account_categories`
- `revenues`, `revenue_categories`, `expenses`, `expense_categories`
- `vendor_payments`, `vendor_payment_allocations`, `customer_payments`, `customer_payment_allocations`
- `bank_transactions`, `bank_transfers`, `journal_entries`, `journal_entry_items`
- `debit_notes`, `debit_note_items`, `debit_note_item_taxes`, `debit_note_applications`
- `credit_notes`, `credit_note_items`, `credit_note_item_taxes`, `credit_note_applications`
- `opening_balances`

Next.js Prisma schema includes models for: `Customer`, `Vendor`, and (when added) `BankAccount`, `ChartOfAccount`, `AccountType`, etc., mapping to these tables for shared database use.

## Implementation Notes

1. **Customers & Vendors** – Full parity: list, create, edit, delete, company-scoped by `created_by`.
2. **Bank Accounts & Chart of Accounts** – List API + simple list UI added; create/edit can be added similarly to customers.
3. **Other sections** – Placeholder pages at `/account/[section]` with `AccountSectionPlaceholder`; stub APIs return empty data so the app does not 403. Full CRUD and reports can be added incrementally following the same pattern (API route + hasAccountPermission + company scope).
