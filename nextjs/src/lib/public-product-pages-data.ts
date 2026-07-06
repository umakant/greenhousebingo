import { featureColumns } from "@/components/nav/featuresData";

export type ProductPageSlug = "features" | "integrations" | "changelog" | "roadmap";

/** Serializable icon id — resolved to Lucide components in the client page only. */
export type ProductIconKey =
  | "file-text"
  | "send"
  | "camera"
  | "calendar"
  | "clipboard-check"
  | "map-pin"
  | "bar-chart-3"
  | "users"
  | "headphones"
  | "message-square"
  | "layout-grid"
  | "calendar-check"
  | "star"
  | "mail"
  | "megaphone"
  | "globe";

export type ProductCardItem = {
  title: string;
  description: string;
  iconKey?: ProductIconKey;
  badge?: string;
};

export type ProductGroupedSection = {
  heading: string;
  items: ProductCardItem[];
};

export type ChangelogEntry = {
  version: string;
  date: string;
  tag?: string;
  highlights: string[];
};

export type RoadmapColumn = {
  title: string;
  subtitle: string;
  items: { title: string; description: string }[];
};

export type PublicProductPageContent = {
  slug: ProductPageSlug;
  eyebrow: string;
  title: string;
  subtitle: string;
  variant: "grouped" | "cards" | "timeline" | "roadmap";
  groupedSections?: ProductGroupedSection[];
  cards?: ProductCardItem[];
  changelog?: ChangelogEntry[];
  roadmap?: RoadmapColumn[];
};

const INTEGRATION_CARDS: ProductCardItem[] = [
  {
    title: "Stripe & PayPal",
    description: "Accept cards, subscriptions, and invoices with secure payment processing.",
    badge: "Payments",
  },
  {
    title: "Twilio SMS & Voice",
    description: "Send OTPs, reminders, and two-way SMS from workflows and HRM.",
    badge: "Messaging",
  },
  {
    title: "Google Calendar",
    description: "Sync LMS live sessions and appointments to team calendars automatically.",
    badge: "Calendar",
  },
  {
    title: "SMTP Email",
    description: "Deliver welcome emails, notifications, and campaigns through your mail server.",
    badge: "Email",
  },
  {
    title: "WhatsApp Business",
    description: "Unified inbox for WhatsApp conversations tied to contacts and deals.",
    badge: "Inbox",
  },
  {
    title: "Zoom & Meet links",
    description: "Attach video conference links to appointments and live training sessions.",
    badge: "Meetings",
  },
  {
    title: "Webhooks & API",
    description: "Connect Paper Flight to your stack with REST APIs and outbound webhooks.",
    badge: "Developer",
  },
  {
    title: "Storefront themes",
    description: "Shopify-compatible themes and liquid templates for branded online stores.",
    badge: "Commerce",
  },
];

const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: "2.8.0",
    date: "May 2026",
    tag: "Latest",
    highlights: [
      "Employee portal role with module access across Taskly, HRM, CRM, POS, and LMS.",
      "Public pricing page with plan comparison matrix and monthly/yearly toggle.",
      "Expense Management cost-transfer drawer and bulk approve confirmation.",
    ],
  },
  {
    version: "2.7.0",
    date: "April 2026",
    highlights: [
      "LMS live sessions, Google Calendar sync, subscriptions, and course reviews.",
      "Customer portal for expense management linked from Accounting customers.",
      "Launchpad workspace overview for company and employee accounts.",
    ],
  },
  {
    version: "2.6.0",
    date: "March 2026",
    highlights: [
      "Expense Management module with reports, receipts, and analytics.",
      "Storefront seven-band and concept HTML theme templates.",
      "Recruitment and resume builder add-on permissions on startup.",
    ],
  },
  {
    version: "2.5.0",
    date: "February 2026",
    highlights: [
      "Support tickets, assets tracking, and WhatsApp chat modules.",
      "Form builder and appointment scheduling improvements.",
      "Plan modules auto-include new add-ons on server startup.",
    ],
  },
];

const ROADMAP_COLUMNS: RoadmapColumn[] = [
  {
    title: "Now",
    subtitle: "In active development",
    items: [
      { title: "AI assistant for inbox", description: "Draft replies and summarize threads across channels." },
      { title: "Advanced commission payouts", description: "LMS instructor commissions with accounting sync." },
      { title: "Mobile-optimized field app", description: "Crew check-ins, photos, and job notes on the go." },
    ],
  },
  {
    title: "Next",
    subtitle: "Queued for upcoming releases",
    items: [
      { title: "Two-way QuickBooks sync", description: "Invoices, payments, and chart of accounts alignment." },
      { title: "Reputation automation 2.0", description: "Multi-location review requests and response templates." },
      { title: "Custom report builder", description: "Drag-and-drop dashboards across CRM, POS, and HRM." },
    ],
  },
  {
    title: "Later",
    subtitle: "Exploring with customers",
    items: [
      { title: "Marketplace for templates", description: "Share workflows, forms, and funnel packs between orgs." },
      { title: "Franchise rollups", description: "HQ dashboards across branches with consolidated billing." },
      { title: "Voice AI outbound", description: "Automated follow-up calls with human handoff." },
    ],
  },
];

const FEATURE_TITLE_ICON_KEYS: Record<string, ProductIconKey> = {
  Estimates: "file-text",
  Invoicing: "send",
  "PaperFlight Cam": "camera",
  Scheduling: "calendar",
  "Inspection Forms": "clipboard-check",
  "MapMeasure Pro": "map-pin",
  "Business Analytics": "bar-chart-3",
  EmployeeHub: "users",
  "Virtual Call Team": "headphones",
  ClientHub: "message-square",
  InstaQuote: "layout-grid",
  InstaSchedule: "calendar-check",
  "Review Multiplier": "star",
  "Email & Text Automation": "mail",
  "Mass Campaigns": "megaphone",
  "AI Website Builder": "globe",
};

function buildFeaturesSections(): ProductGroupedSection[] {
  return featureColumns.map((col) => ({
    heading: col.heading,
    items: col.items.map((item) => ({
      title: item.title,
      description: item.description,
      iconKey: FEATURE_TITLE_ICON_KEYS[item.title] ?? "layout-grid",
    })),
  }));
}

const MODULE_HIGHLIGHTS: ProductGroupedSection = {
  heading: "Platform modules",
  items: [
    {
      title: "Taskly Projects",
      description: "Tasks, bugs, milestones, and team collaboration.",
      iconKey: "clipboard-check",
    },
    {
      title: "HRM",
      description: "Employees, payroll, attendance, leave, and portal logins.",
      iconKey: "users",
    },
    {
      title: "CRM & POS",
      description: "Leads, deals, sales, inventory, and branch operations.",
      iconKey: "bar-chart-3",
    },
    {
      title: "LMS",
      description: "Courses, live classes, subscriptions, and instructor tools.",
      iconKey: "calendar",
    },
    {
      title: "Expense Management",
      description: "Reports, receipts, approvals, and customer portals.",
      iconKey: "file-text",
    },
    {
      title: "Storefront",
      description: "Themes, products, and checkout for service businesses.",
      iconKey: "globe",
    },
  ],
};

const PAGE_CONTENT: Record<ProductPageSlug, PublicProductPageContent> = {
  features: {
    slug: "features",
    eyebrow: "Features",
    title: "Everything your service business needs",
    subtitle:
      "Run crews, customers, and operations from one platform — estimates, scheduling, CRM, payroll, learning, and more.",
    variant: "grouped",
    groupedSections: [...buildFeaturesSections(), MODULE_HIGHLIGHTS],
  },
  integrations: {
    slug: "integrations",
    eyebrow: "Integrations",
    title: "Connect the tools you already use",
    subtitle:
      "Paper Flight plugs into payments, messaging, calendars, and commerce — plus every module in your subscription plan.",
    variant: "cards",
    cards: INTEGRATION_CARDS,
  },
  changelog: {
    slug: "changelog",
    eyebrow: "Changelog",
    title: "What's new in Paper Flight",
    subtitle: "Release notes for platform updates, new modules, and improvements shipped to your workspace.",
    variant: "timeline",
    changelog: CHANGELOG_ENTRIES,
  },
  roadmap: {
    slug: "roadmap",
    eyebrow: "Roadmap",
    title: "Where we're headed",
    subtitle:
      "A transparent look at what we're building now, next, and later — shaped by feedback from service professionals.",
    variant: "roadmap",
    roadmap: ROADMAP_COLUMNS,
  },
};

export function getProductPageContent(slug: ProductPageSlug): PublicProductPageContent {
  return PAGE_CONTENT[slug];
}

/** @deprecated Use MARKETING_PAGE_HREFS from public-info-pages-data */
export { MARKETING_PAGE_HREFS as PRODUCT_PAGE_HREFS } from "@/lib/public-info-pages-data";
