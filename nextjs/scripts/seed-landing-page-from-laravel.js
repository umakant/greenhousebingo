/* eslint-disable no-console */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function nextSettingId() {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function upsertAdminSetting(superadminId, key, value) {
  const existing = await prisma.setting.findFirst({
    where: { key, createdBy: superadminId },
    select: { id: true },
  });
  if (existing?.id) {
    await prisma.setting.update({ where: { id: existing.id }, data: { value: String(value), updatedAt: new Date() } });
    return;
  }
  await prisma.setting.create({
    data: {
      id: await nextSettingId(),
      key,
      value: String(value),
      isPublic: true,
      createdBy: superadminId,
      createdAt: new Date(),
    },
  });
}

function laravelDefaultConfigSections() {
  return {
    sections: {
      hero: {
        variant: "hero1",
        title: "Transform Your Business with WorkDo Dash",
        subtitle:
          "The complete all-in-one business management solution that combines Project Management, Accounting, HRM, CRM, POS, and Product Management into a single powerful platform. Streamline operations, boost productivity, and grow your business with our integrated suite of tools.",
        primary_button_text: "Start Free Trial",
        primary_button_link: "/register",
        secondary_button_text: "Login",
        secondary_button_link: "/login",
        highlight_text: "WorkDo Dash",
        image: "/packages/workdo/LandingPage/src/marketplace/hero.png",
      },
      header: {
        variant: "header1",
        company_name: "WorkDo Dash",
        cta_text: "Get Started",
        enable_addon_link: true,
        enable_pricing_link: true,
        navigation_items: [{ text: "Home", href: "/" }],
      },
      stats: {
        variant: "stats1",
        stats: [
          { label: "Businesses Trust Us", value: "10,000+" },
          { label: "Uptime Guarantee", value: "99.9%" },
          { label: "Customer Support", value: "24/7" },
          { label: "Countries Worldwide", value: "50+" },
        ],
      },
      features: {
        variant: "features1",
        title: "Powerful Features",
        subtitle: "Everything your business needs in one integrated platform",
        features: [
          {
            title: "Project Management",
            description:
              "Organize and track projects efficiently. Manage tasks, milestones, and deadlines with team collaboration. Track progress with Gantt charts and Kanban boards.",
            icon: "FolderOpen",
          },
          {
            title: "Accounting",
            description:
              "Manage finances with ease and accuracy. Handle invoices, bills, and payments. Track income and expenses and generate detailed financial reports.",
            icon: "Calculator",
          },
          {
            title: "HRM",
            description:
              "Simplify employee management and payroll. Manage employee records and profiles, attendance and leave management, and payroll processing automation.",
            icon: "UserCheck",
          },
          {
            title: "CRM",
            description:
              "Strengthen customer relationships and improve sales. Manage leads and contacts, track sales pipeline, and handle deal and opportunity management.",
            icon: "Users",
          },
          {
            title: "POS",
            description:
              "Fast and reliable point-of-sale solution. Process transactions quickly, manage inventory in real-time, and handle multiple payment methods.",
            icon: "CreditCard",
          },
          {
            title: "Product & Service",
            description:
              "Manage your products and services catalog efficiently. Organize product categories, manage inventory levels, and implement pricing strategies.",
            icon: "Package",
          },
        ],
      },
      modules: {
        variant: "modules1",
        title: "Complete Business Solutions",
        subtitle: "Discover our comprehensive modules designed to streamline every aspect of your business operations",
        modules: [
          {
            key: "taskly",
            label: "Project",
            title: "Project Management System",
            description:
              "Organize and track projects efficiently with comprehensive project management tools. Manage tasks, milestones, and deadlines with team collaboration in one centralized platform. Track progress with Gantt charts and Kanban boards, assign tasks and set priorities, monitor project timelines and deliverables, and generate detailed project reports. Perfect for teams of any size.",
            image: "/packages/workdo/LandingPage/src/marketplace/image1.png",
          },
          {
            key: "account",
            label: "Accounting",
            title: "Complete Accounting & Financial Management",
            description:
              "Streamline your financial operations with our comprehensive accounting system. Manage invoices, bills, and payments, track income and expenses, perform bank account reconciliation, and generate detailed financial reports. Professional invoice generation, vendor and customer management, tax calculations and compliance, with real-time financial analytics.",
            image: "/packages/workdo/LandingPage/src/marketplace/image2.png",
          },
          {
            key: "hrm",
            label: "HRM",
            title: "Human Resource Management System",
            description:
              "Complete employee management solution for modern businesses. Manage employee records and profiles, attendance and leave management, payroll processing and automation, and performance evaluations. Handle department and designation management, recruitment process handling, employee benefits management, and comprehensive HR reporting.",
            image: "/packages/workdo/LandingPage/src/marketplace/image3.png",
          },
          {
            key: "lead",
            label: "CRM",
            title: "Customer Relationship Management",
            description:
              "Build stronger customer relationships and boost sales with our powerful CRM system. Manage leads and contacts, track sales pipeline, handle deal and opportunity management, and monitor customer interaction tracking. Automate follow-ups, analyze sales performance, forecast revenue, and maintain customer communication history.",
            image: "/packages/workdo/LandingPage/src/marketplace/image4.png",
          },
          {
            key: "pos",
            label: "POS",
            title: "Point of Sale System",
            description:
              "Fast, reliable point-of-sale solution for retail and service businesses. Process transactions quickly, manage inventory in real-time, handle multiple payment methods, and generate instant receipts. Track product stock, support barcode scanning, handle returns and exchanges, and generate comprehensive sales reports.",
            image: "/packages/workdo/LandingPage/src/marketplace/image5.png",
          },
          {
            key: "productservice",
            label: "Product & Service",
            title: "Product & Service Management",
            description:
              "Efficiently manage your complete products and services catalog. Organize product categories, manage inventory levels, implement pricing strategies and variations, and handle product attributes. Manage stock across multiple locations, set up automated reorder points, track product performance, and maintain detailed product specifications.",
            image: "/packages/workdo/LandingPage/src/marketplace/image6.png",
          },
        ],
      },
      benefits: {
        variant: "benefits1",
        title: "Why Choose WorkDo Dash?",
        benefits: [
          {
            title: "Complete Project Management",
            description:
              "Organize and track all your projects in one place with powerful task management, team collaboration, and progress tracking tools.",
          },
          {
            title: "Integrated Financial System",
            description:
              "Manage your finances seamlessly with comprehensive accounting, invoicing, expense tracking, and real-time financial reporting.",
          },
          {
            title: "Efficient HR Management",
            description:
              "Streamline employee management with automated payroll, attendance tracking, leave management, and performance evaluation tools.",
          },
          {
            title: "Powerful CRM Tools",
            description:
              "Build stronger customer relationships with lead management, sales pipeline tracking, and automated follow-up systems.",
          },
          {
            title: "Modern POS Solution",
            description:
              "Process sales quickly with our intuitive point-of-sale system featuring inventory management and multiple payment options.",
          },
          {
            title: "Scalable & Secure",
            description:
              "Enterprise-grade security with cloud-based infrastructure that grows with your business needs and ensures data protection.",
          },
        ],
      },
      gallery: {
        variant: "gallery1",
        title: "See WorkDo Dash in Action",
        subtitle: "Explore our intuitive interface and powerful features through real screenshots of our platform",
        images: [
          "/packages/workdo/LandingPage/src/marketplace/image1.png",
          "/packages/workdo/LandingPage/src/marketplace/image2.png",
          "/packages/workdo/LandingPage/src/marketplace/image3.png",
          "/packages/workdo/LandingPage/src/marketplace/image4.png",
        ],
      },
      cta: {
        variant: "cta1",
        title: "Ready to Transform Your Business?",
        subtitle: "Join thousands of businesses already using WorkDo Dash to streamline their operations.",
        primary_button: "Start Free Trial",
        primary_button_link: "/register",
        secondary_button: "Contact Sales",
        secondary_button_link: "/login",
      },
      addons: {
        title: "Premium Addons",
        subtitle: "Extend your WorkDo Dash with powerful premium modules designed to enhance your business operations",
        per_page: 20,
        default_price_type: "monthly",
        card_variant: "card1",
        show_search: true,
        show_category: true,
        show_price: true,
        show_sort: true,
        empty_message: "No addons available. Check back later for new premium addons and modules.",
      },
      pricing: {
        title: "Subscription Setting",
        subtitle: "Choose the perfect subscription plan for your business needs",
        default_subscription_type: "pre-package",
        default_price_type: "monthly",
        show_pre_package: true,
        show_usage_subscription: true,
        show_monthly_yearly_toggle: true,
        empty_message: "No plans available. Check back later for new pricing plans.",
      },
      footer: {
        variant: "footer1",
        description:
          "The complete business management solution for modern enterprisesThe complete business management solution for modern enterprises.",
        email: "support@workdodash.com",
        phone: "+1 (555) 123-4567",
        show_contact: true,
        enable_newsletter: true,
        newsletter_title: "Join Our Community",
        newsletter_description: "We build modern web tools to help you jump-start your daily business work.",
        newsletter_button_text: "Subscribe",
        copyright_text: "",
        navigation_sections: [
          {
            title: "Product",
            links: [
              { text: "Features", href: "#features" },
              { text: "Pricing", href: "#pricing" },
              { text: "Demo", href: "#demo" },
            ],
          },
          {
            title: "Company",
            links: [
              { text: "About", href: "#about" },
              { text: "Contact", href: "#contact" },
              { text: "Support", href: "#support" },
            ],
          },
        ],
      },
    },
    section_visibility: {
      header: true,
      hero: true,
      stats: true,
      features: true,
      modules: true,
      benefits: true,
      gallery: true,
      cta: true,
      footer: true,
      addons: true,
      pricing: true,
    },
    section_order: ["header", "hero", "stats", "features", "modules", "benefits", "gallery", "cta", "footer"],
    // Laravel "Blue" preset (as seen in CMS > Landing Page > Colors)
    colors: { primary: "#3b82f6", secondary: "#1d4ed8", accent: "#1e3a8a" },
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in nextjs/.env.local");
  }

  console.log("Seeding landing page settings from Laravel defaults...");

  const superadmin = await prisma.user.findFirst({ where: { type: "superadmin" }, select: { id: true } }).catch(() => null);
  const superadminId = superadmin?.id ?? 1n;

  const companyName = "WorkDo Dash";
  const contactEmail = "support@workdodash.com";
  const contactPhone = "+1 (555) 123-4567";
  const contactAddress = "123 Business Ave, City, State 12345";

  const configSections = laravelDefaultConfigSections();

  const existing = await prisma.landingPageSetting.findFirst({ orderBy: { id: "asc" }, select: { id: true } }).catch(() => null);
  if (existing?.id) {
    await prisma.landingPageSetting.update({
      where: { id: existing.id },
      data: {
        companyName,
        contactEmail,
        contactPhone,
        contactAddress,
        configSections,
        updatedAt: new Date(),
      },
    });
  } else {
    const agg = await prisma.landingPageSetting.aggregate({ _max: { id: true } });
    const nextId = (agg._max.id ?? 0n) + 1n;
    await prisma.landingPageSetting.create({
      data: {
        id: nextId,
        companyName,
        contactEmail,
        contactPhone,
        contactAddress,
        configSections,
        createdAt: new Date(),
      },
    });
  }

  await upsertAdminSetting(superadminId, "landingPageEnabled", "1");
  await upsertAdminSetting(superadminId, "enableRegistration", "on");

  console.log("✓ Seeded landing page settings");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => null);
  });

