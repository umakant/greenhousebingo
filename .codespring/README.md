# CodeSpring – Paper Flight Dash

This folder holds CodeSpring-linked artifacts for **Paper Flight Dash** (project ID: `820d5217-892d-42fc-b0ca-c096d74836d0`).

## Contents

- **config.json** – Project link (projectId, projectName, organizationId).
- **PRD-Admin-Dashboard-Migration.md** – PRD for migrating the ADMIN (company admin) dashboard to Next.js, with section-by-section scope and task checklists.
- **admin-dashboard-migration-tasks.json** – Structured list of sections and tasks for the same migration (for importing into CodeSpring when the API is available).

## Syncing the Admin Dashboard Migration Plan to CodeSpring

When the CodeSpring API is reachable:

1. **Create or select a feature** (e.g. “Admin Dashboard Migration”) in the project mindmap.
2. **Create sub-features or nodes** per section (Dashboard, User Management, Proposal, Sales, Purchase, Media, Messenger, Helpdesk, Plan, Settings).
3. **Create tasks** from `admin-dashboard-migration-tasks.json`: one task per `tasks[].title` under each `sections[]`, and link them to the corresponding section/feature.
4. **Sync the PRD** using CodeSpring’s PRD sync (e.g. `sync_prd`) with the content of `PRD-Admin-Dashboard-Migration.md` so the plan is stored as the project’s migration PRD.

## Task summary (by section)

| Section | Title | Task count |
|---------|--------|------------|
| 1 | Dashboard (Admin Home) | 3 |
| 2 | User Management (Roles & Users) | 6 |
| 3 | Proposal (Sales Proposals) | 5 |
| 4 | Sales Invoice & Sales Returns | 6 |
| 5 | Purchase (Invoices, Returns, Warehouses, Transfers) | 5 |
| 6 | Media Library | 2 |
| 7 | Messenger | 5 |
| 8 | Helpdesk | 2 |
| 9 | Plan / Subscription | 5 |
| 10 | Settings | 2 |

**Total tasks:** 41
