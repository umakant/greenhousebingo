/** Curriculum for "Background Checks: Turning Screening into Funds" (Teachable import). */

const COURSE_SLUG = "background-checks-turning-screening-into-funds";
const SEED_KEY = "far-lms-background-checks";

const PDF_BASE = "/uploads/lms/background-checks";

function pdf(title, fileName, bodyText) {
  return {
    title,
    lessonType: "PDF",
    videoUrl: `${PDF_BASE}/${fileName}`,
    bodyText: bodyText ?? null,
    isPublished: true,
  };
}

const COURSE = {
  seedKey: SEED_KEY,
  slug: COURSE_SLUG,
  title: "Background Checks: Turning Screening into Funds",
  description: `Barlow's Guide to Lab Earning with Background Checks.

Learn how to turn background checks into a profitable add-on for your lab business. We'll cover setup, pricing, and marketing so you can position this service as a trusted, compliant, and consistent revenue stream.

Powered by Akira Barlow.`,
  deliveryType: "VIDEO",
  isPublic: true,
  status: "PUBLISHED",
  category: {
    slug: "lab-business",
    name: "Lab Business",
    description: "Revenue, compliance, and operational courses for lab and field service businesses.",
  },
  instructor: {
    displayName: "Akira Barlow",
    headline: "Lab business & compliance educator",
    bio: "Akira Barlow teaches specimen collection and lab operators how to add compliant background screening services as a recurring revenue stream.",
    expertise: ["Background screening", "Lab operations", "Compliance", "Sales"],
  },
  sections: [
    {
      title: "Background Checks — Turning Screening into Funds",
      lessons: [
        {
          title: "Getting Started with the Process",
          lessonType: "VIDEO",
          durationSeconds: 20 * 60 + 6,
          bodyText: `In this lesson you will learn how to introduce background screening as a structured service for your lab or mobile collection business.

Topics covered:
• When to offer screening as an add-on vs. bundled service
• Client intake and consent workflow
• Turnaround expectations and compliance basics
• Pricing models that protect margin
• Hand-off between your team and the screening vendor

Duration: 20:06

Upload your hosted lesson video in LMS → Courses → this lesson → Video URL when ready.`,
          isPublished: true,
        },
        {
          title: "Background Check Vendors",
          lessonType: "TEXT",
          bodyText: `BACKGROUND CHECK VENDORS

Partner with established screening providers that support occupational health, healthcare, and high-volume employer programs.

Recommended vendor categories to evaluate:
• HireRight — enterprise-grade employment screening
• Checkr — modern API-first background checks
• Universal Background — nationwide criminal & employment history
• Reveal Background — flexible packages for staffing clients
• Corra Group — international and executive screening

Selection checklist:
1. FCRA-compliant disclosures and adverse action support
2. Turnaround time SLAs that match your client contracts
3. API or portal workflow your dispatch team can operate
4. Transparent pass-through pricing for resale
5. Dedicated support for healthcare and event staffing verticals

Document client authorization, collect required identifiers, and route orders through your chosen vendor portal.`,
          isPublished: true,
        },
        pdf(
          "Marketing Your Background Check Business",
          "marketing-your-background-check-services.pdf",
          `Download and review the marketing guide for positioning background screening as a risk-reduction service for your lab and staffing clients.

Use this one-pager and talking points in email campaigns, lunch-and-learn sessions, and co-branded materials with your screening vendor.`,
        ),
        pdf(
          "Selling Script",
          "background-check-selling-script.pdf",
          `Use this selling script when introducing background screening to existing lab, staffing, and event clients.

It includes discovery questions, value framing, package tiers, and responses to common pricing objections.`,
        ),
      ],
    },
    {
      title: "Compliance & Agreement Documents",
      lessons: [
        pdf(
          "FCRA — Summary of Your Rights",
          "fcra-summary-of-your-rights.pdf",
          `Required FCRA disclosure for candidates. Provide this summary to consumers before obtaining a background report.`,
        ),
        pdf(
          "FCRA Notice to Furnishers",
          "fcra-notice-to-furnishers.pdf",
          `Notice for furnishers of consumer report information. Share with data providers and partners in your screening workflow.`,
        ),
        pdf(
          "Notice to Users of Consumer Reports",
          "notice-to-users-of-consumer-reports.pdf",
          `FCRA notice for employers and end-users of consumer reports. Keep on file for compliance audits and client onboarding.`,
        ),
        pdf(
          "Sample Background Check Agreement",
          "sample-background-check-agreement.pdf",
          `Template service agreement for background check programs. Customize with your company name, pricing, and vendor details before client signature.`,
        ),
      ],
    },
  ],
};

module.exports = {
  COURSE_SLUG,
  SEED_KEY,
  COURSE,
  PDF_BASE,
};
