# Paper Flight CC - WorkDo Dash (Next.js)

## Overview
Paper Flight CC's WorkDo Dash is a Next.js application serving as the frontend for a comprehensive business management platform. It's designed to provide an integrated solution for various business operations, starting with an MVP that includes user authentication and a superadmin dashboard. The platform aims to streamline business processes through specialized modules for appointments, HR, recruitment, accounting, real-time messaging, CRM, and point-of-sale operations. The overarching vision is to offer a robust, scalable, and user-friendly system that enhances operational efficiency and decision-making for businesses.

## User Preferences
The user prefers clear, concise communication and a systematic approach to development. I expect the agent to work iteratively, focusing on one task or module at a time, and to clearly articulate the proposed changes before implementation. Detailed explanations of complex logic or architectural decisions are highly valued. I also prefer the agent to use modern JavaScript practices and maintain a clean, readable codebase.

## System Architecture
The application is built on Next.js 16.1.6 with Turbopack, utilizing React 19, TypeScript, and Tailwind CSS for the frontend. Radix UI, Lucide React, and Recharts are used for UI components and data visualization. The backend interacts with PostgreSQL via Prisma ORM (Prisma 5).

### Addon Modules (Installed):
- **Support Ticket** (permissions 700-718): Tickets, Knowledge Base, FAQ, Contact, System Setup. Routes under `/support-ticket/`.
- **Assets** (permissions 720-755): Full asset lifecycle management including Assets, Assignments, Locations, Maintenance, Depreciation, Categories, and Borrow & Rent sub-module (with Payments and Report). Routes under `/assets/` and `/assets/[section]`. 8 Prisma models: AssetCategory, AssetLocation, Asset, AssetAssignment, AssetMaintenance, AssetDepreciation, AssetBorrowRent, AssetBorrowPayment.

### Core Features and Modules:
- **Authentication**: Includes robust login and registration flows.
- **Role-Based Access Control (RBAC)**: Manages permissions dynamically, supporting superadmin, company, and staff roles with compact cookie storage for performance.
- **Appointment Module**: Comprehensive booking system with schedules, questions, callbacks, and administrative settings.
- **HRM Module**: Manages branches, departments, employees, attendance, leave, payroll, and various HR-related activities.
- **Recruitment Module**: Covers job postings, candidate management, interviews, offers, and onboarding processes.
- **Accounting Module**: Handles bank accounts, transactions, revenues, expenses, payments, debit/credit notes, chart of accounts, and financial reporting.
- **Messenger Module**: Real-time, per-company chat system with message history, favorites, and read receipts.
- **CRM Module**: Manages leads, deals, pipelines, and CRM-specific reporting.
- **POS Module**: Full point-of-sale system including product catalog, inventory, customer/vendor management, transactions (sales, purchases, returns, quotations), cashier interface, barcode printing, and detailed reporting.

### Landing Page (Rebuilt):
- **Hero slideshow**: 22 industries, each using `industry-*.png` photo as background. Auto-advances every 5s. Slide indicator dots at bottom. Light gradient `from-background/90 via-background/70 to-background/30`.
- **Industry strip**: 3-panel layout — LEFT panel (6 before active, right-aligned), CENTER featured card (96×96 icon, primary border), RIGHT panel (6 after active, left-aligned). Uses custom PNG icons from `/images/landing/icons/icon-*.png`.
- **Hero → strip sync**: Hovering a strip item or clicking a dot updates the active slide. Strip center card is always the active industry.
- **Industry images**: All 22 `industry-*.png` extracted from reference dist zip into `/images/landing/icons/`. Icons in `/images/landing/icons/icon-*.png`.
- **Data file**: `nextjs/src/lib/landing-industries-data.ts` has `industries[]` (with `iconImg`, `industryImg`, `stripName`), `heroSlides` (derived from industries), pricing, features, testimonials.
- **Sections**: LeadToCashSection (3 feature cards), IndustriesSection (5 category groups, 6 per group, `home→local→rental→product→medical`), CTASection (paper-flight-icon.png), FooterSection (4 columns + copyright).
- **CSS utilities added**: `hover-elevate` (Y-2px + shadow on hover), `scrollbar-hide` (hides scrollbar).

### UI/UX and Technical Implementations:
- **Responsive Design**: Achieved using Tailwind CSS.
- **Dynamic Routing**: Leverages Next.js App Router for modular page management.
- **State Management**: Implemented using React hooks and context where appropriate.
- **API Design**: RESTful API endpoints for each module, typically under `/api/[module]/`.
- **Data Serialization**: Custom serializers (`ser()`, `jsonR()`) handle BigInt and Decimal types from Prisma for consistent JSON responses.
- **Error Handling**: Includes a global error boundary (`src/app/error.tsx`) and try-catch fallbacks for robust operation.
- **Impersonation**: Superadmin impersonation feature uses form-based POST and server-side redirects for secure session management.

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Prisma ORM**: Used for database interactions and schema management.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **Radix UI**: Unstyled component library for building accessible UI components.
- **Lucide React**: Icon library.
- **Recharts**: Composable charting library for data visualization.

## CMS Features

### Email Templates
- Superadmin-only (redirects company role to /dashboard).
- 22 templates across modules: General (9), CRM/Lead (7), Appointment (4), Recruitment (2).
- Routes: `/email-templates` (list), `/email-templates/[id]` (edit).
- API: `GET /api/email-templates`, `GET/PATCH /api/email-templates/[id]`.
- Supports multi-language content and subject editing.

### Notification Templates
- **Accessible by superadmin AND company admin** (added company role access).
- **31 templates** across modules: General (9), Lead/CRM (7), Appointment (4), HRM (6), Recruitment (5).
- Routes: `/notification-templates` (list), `/notification-templates/[id]/edit` (edit).
- API: `GET /api/notification-templates`, `GET/PATCH /api/notification-templates/[id]`.
- Superadmin sees all 31 templates; company admin sees general + activated-addon modules.
- Module → addon mapping: Lead=crm, Appointment=appointment, HRM=hrm, Recruitment=recruitment.
- All 31 templates have default English content seeded in `notification_template_langs`.
- Seed script: `scripts/seed-notification-templates.js` (upsert-safe, run multiple times).
- Schema ensure script: `scripts/ensure-notifications-schema.js` (runs in deploy/build.sh).
- Permissions: `manage-notification-templates` and `edit-notification-templates` added to company role.
- Sidebar: Company menu now includes "Notification Templates" at order 2920 (between Media Library 2900 and Messenger 2940).

### Landing Page CMS
- Route: `/landing-page` (superadmin only).
- API: `GET/PATCH /api/cms/landing-page`.
- DB: `landing_page_settings` table — columns: `company_name`, `contact_email`, `contact_phone`, `contact_address`, `config_sections` (JSONB).
- Data flow: top-level DB fields (`company_name`, `contact_email`, etc.) are read by footer/header/hero components directly from `settings.*`; they do NOT come from `configSections.sections.footer.email` etc.
- Branding: company_name="Paper Flight", contact_email="support@paperflight.cc". The hero title has `rawTitle.replace(/WorkDo Dash/gi, companyName)` fallback logic.
- CMS tabs: Setup (General/Order/Colors), Layout (Header/Hero/Footer variants), Content (Features/Modules/Benefits), Social (Social Links/Stats/Gallery), Engagement (CTA), Page (Addon/Pricing).
- Social tab "Social Links" sub-tab: edits `sections.social.links` array (platform, url, enabled). Used by footer social icons.
- Footer social icons: read from `settings?.config_sections?.sections?.social?.links`.
- Hard-coded fallbacks updated: footer uses `""` instead of `"support@workdodash.com"` and `""` instead of `"+1 (555) 123-4567"`; header/hero use `"PaperFlight"` instead of `"WorkDo Dash"`.

### Gantt Chart
- Route: `/project/gantt` (permission: `manage-project`); sidebar menu entry between "Projects" and "Projects Report" in company-menu.ts.
- Component: `src/components/project-gantt.tsx` (client component).
- Data model: Own separate Prisma tables — `GanttProject`, `GanttProjectLocation`, `GanttStaff`, `GanttSub`, `GanttProjectStaff`, `GanttProjectSub`, `GanttHourEntry`.
- `companyId` is String(user.id) (no FK); `clientId` is nullable String (no FK).
- API routes: 13 endpoints under `/api/gantt-projects`, `/api/gantt-project-locations`, `/api/gantt-staff`, `/api/gantt-subs`, `/api/gantt-project-staff`, `/api/gantt-project-subs`, `/api/gantt-hour-entries` — all use cookie-based auth (`pf_email`, `pf_role`).
- UI features: Filters toolbar (Added On/Client/Status/Search/+Add Project), month timeline with day columns, expandable project→location→staff/sub hierarchy, right-side edit panel, create/add modals, delete confirmation.
- Uses `date-fns` and `sonner` (not react-toastify) for date ops and notifications.
- SelectItem pattern: Never use `value=""` with Radix UI — use `"__none__"` sentinel.

### Support Ticket Addon
- Module: `SupportTicket`, packageName: `supportticket`, dashboardScope: `supportticket`
- Permissions: IDs 700-718, all seeded in `instrumentation.ts` under "SupportTicket"
- Prisma models (9): `StTicketCategory`, `StKnowledgeBaseCategory`, `StTicket`, `StKnowledgeBase`, `StFaq`, `StContact`, `StSetting`, `StCustomPage`, `StQuickLink`
- API routes under `/api/support-ticket/`: dashboard, tickets, tickets/[id], categories, categories/[id], kb-categories, kb-categories/[id], knowledge-base, knowledge-base/[id], faq, faq/[id], contact, contact/[id], settings, custom-pages, custom-pages/[id], quick-links, quick-links/[id]
- Pages: `/support-ticket` (dashboard), `/support-ticket/tickets`, `/support-ticket/knowledge-base`, `/support-ticket/faq`, `/support-ticket/contact`, `/support-ticket/system-setup/[section]`
- Components: `st-dashboard.tsx`, `st-tickets-admin.tsx`, `st-knowledge-base-admin.tsx`, `st-faq-admin.tsx`, `st-contact-admin.tsx`, `st-system-setup.tsx`
- System Setup sections (left sidebar nav): categories, knowledge-categories, brand-settings, custom-pages, title-sections, cta-sections, quick-links, support-information, contact-information
- `StSetting` uses composite unique key `section_key: { section, key }` for upsert
- Sidebar menu: LifeBuoy icon, order 2950 (Helpdesk), permission `manage-support-ticket`

### Assets Addon
- Module: `Assets`, packageName: `assets`, dashboardScope: `assets`
- Permissions: IDs 720-755, all seeded in `instrumentation.ts`
- Prisma models (8): `AssetCategory`, `AssetLocation`, `Asset`, `AssetAssignment`, `AssetMaintenance`, `AssetDepreciation`, `AssetBorrowRent`, `AssetBorrowPayment`
- API routes under `/api/assets/`: dashboard, assets, assets/[id], categories, categories/[id], locations, locations/[id], assignments, assignments/[id], maintenance, maintenance/[id], depreciation, depreciation/[id], borrow-rent, borrow-rent/[id], borrow-payments, borrow-payments/[id]
- Pages: `/assets` (list), `/assets/[section]` (assignments, locations, maintenance, depreciation, categories, borrow-rent, borrow-payments, borrow-report)
- Sidebar menu: Box icon, order 2960; 10 default categories seeded on startup

### WhatsApp Chat Addon
- Module: `WhatsAppChat`, packageName: `whatsappchat`, dashboardScope: `whatsappchat`
- Permissions: IDs 760-766, seeded in `instrumentation.ts`
- Prisma models (4): `WaContact`, `WaMessage`, `WaSetting`, `WaEventNotification`
- API routes under `/api/whatsapp/`: contacts, contacts/[id], messages, settings, events
- Pages: `/whatsapp-chat` (two-panel chat UI), `/whatsapp-chat/settings` (API config + event notification toggles)
- 12 default event notifications seeded (new_invoice, invoice_paid, new_ticket, etc.); 4 default settings seeded (provider, account_sid, auth_token, from_number)
- Sidebar menu: BotMessageSquare icon, order 2958 (just before Assets)
- "Chat with new user" dialog supports "Choose From Users" or "Custom" type with phone number validation

### Key Dev Notes
- activatedPackages cookie is baked at login — users must re-login to pick up plan/addon changes.
- RBAC seed: `scripts/seed-rbac-demo.js` includes `manage-notification-templates` and `edit-notification-templates` in companyPermissions array.
- COMMON_MENU_ORDERS: 2900=Media Library, 2920=Notification Templates, 2940=Messenger, 2950=Helpdesk, 2958=WhatsApp Chat, 2960=Assets, 2980=Plan, 3000=Settings.