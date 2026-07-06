export type ComparePageSlug = "highlevel" | "hubspot" | "jobber" | "servicetitan";

export type CompareRow = {
  category: string;
  paperFlight: string;
  competitor: string;
};

export type PublicComparePageContent = {
  slug: ComparePageSlug;
  competitorName: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  whySwitch: string[];
  rows: CompareRow[];
};

const COMPARE_PAGES: Record<ComparePageSlug, PublicComparePageContent> = {
  highlevel: {
    slug: "highlevel",
    competitorName: "HighLevel",
    eyebrow: "Compare",
    title: "Paper Flight vs HighLevel",
    subtitle:
      "Both platforms target agencies and service businesses — here's how Paper Flight stacks up on price, modules, and day-to-day operations.",
    intro:
      "HighLevel is known for marketing automation and white-label agency tools. Paper Flight focuses on running the whole service business: crews, CRM, POS, HRM, LMS, expense workflows, and storefront — with straightforward pricing.",
    whySwitch: [
      "All-in-one operations beyond funnels and CRM — payroll, inventory, and field teams included.",
      "Flat, growth-friendly pricing without per-contact or per-seat surprises.",
      "Built-in modules you can enable as you scale (Taskly, HRM, Appointment, LMS, and more).",
    ],
    rows: [
      { category: "Core focus", paperFlight: "Service ops + CRM + growth", competitor: "Agency marketing & funnels" },
      { category: "Pricing model", paperFlight: "Flat plans, unlimited growth mindset", competitor: "Tiered plans, contact/seat limits" },
      { category: "HRM & payroll", paperFlight: "Full employee portal & payroll", competitor: "Limited native HR depth" },
      { category: "POS & inventory", paperFlight: "Branches, registers, purchases", competitor: "Not a core strength" },
      { category: "LMS & training", paperFlight: "Courses, live classes, subscriptions", competitor: "Add-ons / third-party" },
      { category: "White label", paperFlight: "Brand settings & client portals", competitor: "Strong agency white-label" },
      { category: "Integrations", paperFlight: "Stripe, Twilio, Google Calendar, API", competitor: "Large marketplace" },
    ],
  },
  hubspot: {
    slug: "hubspot",
    competitorName: "HubSpot",
    eyebrow: "Compare",
    title: "Paper Flight vs HubSpot",
    subtitle:
      "HubSpot excels at inbound marketing CRM. Paper Flight is built for service businesses that need scheduling, crews, billing, and operations in one place.",
    intro:
      "If you run a field service or training company, you may outgrow marketing-only CRM stacks. Paper Flight connects leads to jobs, invoices, employees, and customer portals without juggling five tools.",
    whySwitch: [
      "Operational modules beyond marketing — appointments, projects, expenses, and storefront.",
      "One login for office staff and employee portal users.",
      "Pricing designed for service teams, not enterprise marketing seat counts.",
    ],
    rows: [
      { category: "Primary buyer", paperFlight: "Service & field businesses", competitor: "Marketing & sales teams" },
      { category: "CRM & pipeline", paperFlight: "Leads, deals, activities", competitor: "Industry-leading CRM" },
      { category: "Marketing automation", paperFlight: "Campaigns, email, workflows", competitor: "Advanced marketing hub" },
      { category: "Scheduling & jobs", paperFlight: "Appointments, crews, Taskly", competitor: "Requires ops add-ons" },
      { category: "Invoicing & POS", paperFlight: "Native sales & purchases", competitor: "Quotes via Sales Hub" },
      { category: "Employee management", paperFlight: "HRM with portal access", competitor: "Not included" },
      { category: "Cost at scale", paperFlight: "Predictable module-based plans", competitor: "Hubs & seats add up" },
    ],
  },
  jobber: {
    slug: "jobber",
    competitorName: "Jobber",
    eyebrow: "Compare",
    title: "Paper Flight vs Jobber",
    subtitle:
      "Jobber is a favorite for home-service scheduling and quoting. Paper Flight offers that workflow plus CRM, HRM, LMS, POS, and multi-branch operations.",
    intro:
      "Teams that start with Jobber often need accounting depth, employee portals, training, or multi-location POS as they grow. Paper Flight keeps field workflows and adds a full back office.",
    whySwitch: [
      "Expand beyond jobber-style scheduling into payroll, learning, and inventory.",
      "Customer and employee portals for self-service.",
      "Single platform for franchise or multi-branch operators.",
    ],
    rows: [
      { category: "Field scheduling", paperFlight: "Appointments + crew views", competitor: "Excellent job scheduling" },
      { category: "Quoting & invoicing", paperFlight: "Proposals, POS, accounting tie-ins", competitor: "Strong quotes & invoices" },
      { category: "CRM depth", paperFlight: "Pipelines, campaigns, messenger", competitor: "Client CRM basics" },
      { category: "Payroll & HR", paperFlight: "Full HRM module", competitor: "Time tracking focus" },
      { category: "Training / LMS", paperFlight: "Courses & live sessions", competitor: "Not included" },
      { category: "Multi-branch POS", paperFlight: "Registers, targets, returns", competitor: "Limited" },
      { category: "Platform breadth", paperFlight: "15+ enableable modules", competitor: "Home-service focused" },
    ],
  },
  servicetitan: {
    slug: "servicetitan",
    competitorName: "ServiceTitan",
    eyebrow: "Compare",
    title: "Paper Flight vs ServiceTitan",
    subtitle:
      "ServiceTitan is enterprise-grade for trades. Paper Flight delivers similar operational breadth with flexible modules and pricing that fits growing service brands.",
    intro:
      "ServiceTitan targets large HVAC, plumbing, and electrical contractors. Paper Flight serves the same industries with modular add-ons — start lean, turn on HRM, LMS, or storefront when ready.",
    whySwitch: [
      "Faster time-to-value without enterprise implementation cycles.",
      "Modular pricing — pay for what you use across plans.",
      "Modern web stack with launchpad, integrations, and employee portals.",
    ],
    rows: [
      { category: "Target segment", paperFlight: "SMB to mid-market service", competitor: "Enterprise trades" },
      { category: "Dispatch & jobs", paperFlight: "Projects, appointments, Taskly", competitor: "Deep dispatch suite" },
      { category: "Sales & estimates", paperFlight: "CRM, proposals, POS", competitor: "Robust pricebook & sales" },
      { category: "Accounting tie-in", paperFlight: "Customers, expenses, reports", competitor: "Strong financial tooling" },
      { category: "Learning & certs", paperFlight: "LMS for crew training", competitor: "Partner ecosystem" },
      { category: "Implementation", paperFlight: "Self-serve + support", competitor: "Long onboarding" },
      { category: "Flexibility", paperFlight: "Enable modules per plan", competitor: "All-in enterprise bundle" },
    ],
  },
};

export function getComparePageContent(slug: ComparePageSlug): PublicComparePageContent {
  return COMPARE_PAGES[slug];
}

export function isComparePageSlug(slug: string): slug is ComparePageSlug {
  return slug in COMPARE_PAGES;
}

export const COMPARE_PAGE_SLUGS = Object.keys(COMPARE_PAGES) as ComparePageSlug[];

/** Footer labels for compare links */
export const COMPARE_PAGE_HREFS: Record<string, string> = {
  "vs HighLevel": "/compare/highlevel",
  "vs HubSpot": "/compare/hubspot",
  "vs Jobber": "/compare/jobber",
  "vs ServiceTitan": "/compare/servicetitan",
};
