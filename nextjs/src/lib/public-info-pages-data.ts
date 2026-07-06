import { COMPARE_PAGE_HREFS } from "@/lib/public-compare-pages-data";

export type InfoPageSlug =
  | "about"
  | "contact"
  | "careers"
  | "press"
  | "partners"
  | "terms"
  | "privacy"
  | "security"
  | "dpa"
  | "cookies";

export type InfoDocumentSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type InfoContactItem = {
  label: string;
  value: string;
  href?: string;
  description?: string;
};

export type InfoCardItem = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type PublicInfoPageContent = {
  slug: InfoPageSlug;
  eyebrow: string;
  title: string;
  subtitle: string;
  variant: "document" | "contact" | "cards";
  sections?: InfoDocumentSection[];
  contactItems?: InfoContactItem[];
  cards?: InfoCardItem[];
  lastUpdated?: string;
};

export const DEFAULT_SUPPORT_EMAIL = "support@paperflight.cc";

const PAGE_CONTENT: Record<InfoPageSlug, PublicInfoPageContent> = {
  about: {
    slug: "about",
    eyebrow: "Company",
    title: "Built for service pros, by service pros",
    subtitle:
      "Paper Flight is the all-in-one platform that helps crews, customers, and operations run on autopilot — without punishing you for growing.",
    variant: "document",
    sections: [
      {
        heading: "Our mission",
        paragraphs: [
          "Service businesses deserve software that scales with them — not per-seat fees that climb every time they hire. We built Paper Flight to unify scheduling, CRM, payroll, learning, payments, and customer communication in one place.",
        ],
      },
      {
        heading: "Who we serve",
        paragraphs: [
          "From home services and field crews to training companies and multi-branch operators, Paper Flight adapts to how you actually work in the field and the office.",
        ],
        bullets: [
          "HVAC, plumbing, electrical, and general contractors",
          "Cleaning, landscaping, and property services",
          "Training providers and membership-based operators",
          "Franchises and multi-location service brands",
        ],
      },
      {
        heading: "What we believe",
        paragraphs: [
          "Transparent pricing, unlimited growth, and tools your team will actually use. We ship modules you can turn on as you grow — Taskly, HRM, CRM, POS, LMS, Expense Management, Storefront, and more.",
        ],
      },
    ],
  },
  contact: {
    slug: "contact",
    eyebrow: "Company",
    title: "Get in touch",
    subtitle: "Questions about plans, demos, partnerships, or support? We're here to help.",
    variant: "contact",
    contactItems: [
      {
        label: "General support",
        value: DEFAULT_SUPPORT_EMAIL,
        href: `mailto:${DEFAULT_SUPPORT_EMAIL}`,
        description: "Account help, billing questions, and product guidance.",
      },
      {
        label: "Sales & demos",
        value: DEFAULT_SUPPORT_EMAIL,
        href: `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=Demo%20request`,
        description: "Schedule a walkthrough or discuss plans for your team.",
      },
      {
        label: "Partnerships",
        value: DEFAULT_SUPPORT_EMAIL,
        href: `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=Partnership%20inquiry`,
        description: "Agencies, integrators, and technology partners.",
      },
      {
        label: "Press",
        value: DEFAULT_SUPPORT_EMAIL,
        href: `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=Press%20inquiry`,
        description: "Media kits, interviews, and announcement requests.",
      },
    ],
  },
  careers: {
    slug: "careers",
    eyebrow: "Company",
    title: "Join the Paper Flight team",
    subtitle: "We're building the operating system for modern service businesses. Come grow with us.",
    variant: "cards",
    cards: [
      {
        title: "Full-stack engineer",
        description: "Next.js, TypeScript, Prisma, and integrations that power real-world workflows.",
        ctaLabel: "Apply via email",
        ctaHref: `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=Application%20-%20Full-stack%20engineer`,
      },
      {
        title: "Customer success manager",
        description: "Onboard service businesses and help them get value from every module.",
        ctaLabel: "Apply via email",
        ctaHref: `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=Application%20-%20Customer%20success`,
      },
      {
        title: "Product designer",
        description: "Craft intuitive experiences for field crews and office teams alike.",
        ctaLabel: "Apply via email",
        ctaHref: `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=Application%20-%20Product%20designer`,
      },
    ],
    sections: [
      {
        heading: "Don't see your role?",
        paragraphs: [
          "We're always interested in meeting talented people. Send your resume and a short note about what you'd like to build.",
        ],
      },
    ],
  },
  press: {
    slug: "press",
    eyebrow: "Company",
    title: "Press & media",
    subtitle: "Resources for journalists, analysts, and creators covering Paper Flight.",
    variant: "cards",
    cards: [
      {
        title: "Press inquiries",
        description: "Request interviews, product briefings, or comment for your story.",
        ctaLabel: "Email press",
        ctaHref: `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=Press%20inquiry`,
      },
      {
        title: "Brand assets",
        description: "Logo usage, product screenshots, and executive bios available on request.",
        ctaLabel: "Request kit",
        ctaHref: `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=Brand%20assets%20request`,
      },
      {
        title: "Company overview",
        description: "Paper Flight — the all-in-one platform for service professionals.",
        ctaLabel: "About us",
        ctaHref: "/about",
      },
    ],
  },
  partners: {
    slug: "partners",
    eyebrow: "Company",
    title: "Partner with Paper Flight",
    subtitle: "Agencies, consultants, and technology partners help customers launch faster and grow with confidence.",
    variant: "cards",
    cards: [
      {
        title: "Solution partners",
        description: "Implement Paper Flight for clients — onboarding, workflows, and training.",
        ctaLabel: "Become a partner",
        ctaHref: `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=Solution%20partner%20program`,
      },
      {
        title: "Technology partners",
        description: "Build integrations, apps, and extensions on our platform APIs.",
        ctaLabel: "Explore integrations",
        ctaHref: "/integrations",
      },
      {
        title: "Referral partners",
        description: "Introduce service businesses and earn rewards for qualified referrals.",
        ctaLabel: "Referral inquiry",
        ctaHref: `mailto:${DEFAULT_SUPPORT_EMAIL}?subject=Referral%20partner`,
      },
    ],
  },
  terms: {
    slug: "terms",
    eyebrow: "Legal",
    title: "Terms of Service",
    subtitle: "The agreement between you and Paper Flight for use of our platform and services.",
    variant: "document",
    lastUpdated: "May 2026",
    sections: [
      {
        heading: "Acceptance",
        paragraphs: [
          "By creating an account or using Paper Flight, you agree to these Terms of Service and our Privacy Policy. If you are using the service on behalf of an organization, you represent that you have authority to bind that organization.",
        ],
      },
      {
        heading: "Accounts & subscriptions",
        paragraphs: [
          "You are responsible for safeguarding login credentials and for activity under your account. Paid plans renew according to the billing cycle you select unless cancelled in accordance with your plan terms.",
        ],
        bullets: [
          "Provide accurate registration information",
          "Maintain the security of your account",
          "Comply with applicable laws in your jurisdiction",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "You may not misuse the platform, attempt unauthorized access, interfere with other users, or use Paper Flight to send spam or unlawful content. We may suspend accounts that violate these terms.",
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "Paper Flight is provided as-is to the extent permitted by law. Our liability is limited to the fees you paid in the twelve months preceding a claim, except where prohibited by applicable law.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Questions about these terms: ${DEFAULT_SUPPORT_EMAIL}.`],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    eyebrow: "Legal",
    title: "Privacy Policy",
    subtitle: "How we collect, use, and protect information when you use Paper Flight.",
    variant: "document",
    lastUpdated: "May 2026",
    sections: [
      {
        heading: "Information we collect",
        paragraphs: [
          "We collect information you provide (account details, business data, customer records you upload) and technical data (logs, device type, usage) needed to operate and improve the service.",
        ],
      },
      {
        heading: "How we use information",
        paragraphs: ["We use data to provide the platform, support your account, process payments, send service messages, and improve security."],
        bullets: [
          "Deliver and maintain product features",
          "Authenticate users and prevent fraud",
          "Respond to support requests",
          "Analyze aggregated usage to improve the product",
        ],
      },
      {
        heading: "Sharing",
        paragraphs: [
          "We share data with subprocessors (hosting, email, payments) only as needed to run the service. We do not sell personal information. See our DPA for business customer data processing terms.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Depending on your location, you may request access, correction, deletion, or export of personal data. Contact us to exercise these rights.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Privacy questions: ${DEFAULT_SUPPORT_EMAIL}.`],
      },
    ],
  },
  security: {
    slug: "security",
    eyebrow: "Legal",
    title: "Security",
    subtitle: "How Paper Flight protects your data and keeps your workspace secure.",
    variant: "document",
    lastUpdated: "May 2026",
    sections: [
      {
        heading: "Infrastructure",
        paragraphs: [
          "Production environments use encrypted connections (TLS), role-based access controls, and industry-standard hosting practices. Backups and monitoring help maintain availability.",
        ],
      },
      {
        heading: "Application security",
        paragraphs: ["We apply secure development practices, dependency updates, and permission checks across modules and APIs."],
        bullets: [
          "Authentication with hashed passwords",
          "Role-based permissions per organization",
          "Session and cookie protections for logged-in users",
          "Audit-friendly admin actions where applicable",
        ],
      },
      {
        heading: "Reporting issues",
        paragraphs: [
          `If you discover a security concern, please report it responsibly to ${DEFAULT_SUPPORT_EMAIL} with details so we can investigate promptly.`,
        ],
      },
    ],
  },
  dpa: {
    slug: "dpa",
    eyebrow: "Legal",
    title: "Data Processing Agreement",
    subtitle: "Terms for customers who process personal data through Paper Flight as a data processor.",
    variant: "document",
    lastUpdated: "May 2026",
    sections: [
      {
        heading: "Scope",
        paragraphs: [
          "When you use Paper Flight to store or process personal data about your customers, employees, or contacts, you are the data controller and Paper Flight acts as a data processor on your instructions.",
        ],
      },
      {
        heading: "Processor obligations",
        paragraphs: ["We process personal data only to provide the service, implement appropriate safeguards, and assist with data subject requests where required."],
        bullets: [
          "Process data only on documented instructions",
          "Ensure personnel confidentiality",
          "Assist with security and breach notification obligations",
          "Delete or return data upon termination where applicable",
        ],
      },
      {
        heading: "Subprocessors",
        paragraphs: [
          "We use vetted subprocessors for hosting, email delivery, payments, and messaging. A list is available on request.",
        ],
      },
      {
        heading: "Executing a DPA",
        paragraphs: [
          `Business customers may request a signed DPA by contacting ${DEFAULT_SUPPORT_EMAIL}.`,
        ],
      },
    ],
  },
  cookies: {
    slug: "cookies",
    eyebrow: "Legal",
    title: "Cookie Policy",
    subtitle: "How Paper Flight uses cookies and similar technologies on our website and app.",
    variant: "document",
    lastUpdated: "May 2026",
    sections: [
      {
        heading: "What are cookies",
        paragraphs: [
          "Cookies are small text files stored on your device. We use them to keep you signed in, remember preferences, and understand how our marketing site is used.",
        ],
      },
      {
        heading: "Types we use",
        paragraphs: ["Cookie categories on Paper Flight properties include:"],
        bullets: [
          "Essential — required for login, security, and core functionality",
          "Preferences — remember settings such as language or consent",
          "Analytics — help us improve pages and flows (where enabled)",
        ],
      },
      {
        heading: "Managing cookies",
        paragraphs: [
          "You can control cookies through your browser settings. Disabling essential cookies may affect login and product features.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [`Questions: ${DEFAULT_SUPPORT_EMAIL}.`],
      },
    ],
  },
};

export function getInfoPageContent(slug: InfoPageSlug): PublicInfoPageContent {
  return PAGE_CONTENT[slug];
}

/** Footer and nav labels → marketing routes (product + company + legal + compare). */
export const MARKETING_PAGE_HREFS: Record<string, string> = {
  Features: "/features",
  Pricing: "/pricing",
  Integrations: "/integrations",
  Changelog: "/changelog",
  Roadmap: "/roadmap",
  About: "/about",
  Contact: "/contact",
  Careers: "/careers",
  Press: "/press",
  Partners: "/partners",
  Terms: "/terms",
  Privacy: "/privacy",
  Security: "/security",
  DPA: "/dpa",
  Cookies: "/cookies",
  ...COMPARE_PAGE_HREFS,
};
