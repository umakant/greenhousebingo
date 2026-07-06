export type IndustryCategory = "home" | "medical" | "product" | "local" | "rental";

export type Industry = {
  slug: string;
  name: string;
  stripName: string;
  description: string;
  category: IndustryCategory;
  iconImg: string;
  industryImg: string;
};

export const industryCategories: Record<IndustryCategory, string> = {
  home: "Home & Field Services",
  local: "Recurring & Route-Based",
  product: "Custom & Product-Based",
  medical: "Compliance & High-Trust",
  rental: "Rental Services",
};

export const industries: Industry[] = [
  { slug: "pressure-washing", name: "Pressure Washing", stripName: "Pressure Washing", description: "Manage quotes, schedule jobs, and automate follow-ups for residential and commercial pressure washing.", category: "home", iconImg: "/images/landing/icons/icon-pressure-washing.png", industryImg: "/images/landing/icons/industry-pressure-washing.png" },
  { slug: "cleaning-services", name: "Cleaning Services", stripName: "Cleaning Services", description: "Streamline recurring appointments, team dispatch, and customer communication for your cleaning business.", category: "home", iconImg: "/images/landing/icons/icon-cleaning.png", industryImg: "/images/landing/icons/industry-cleaning.png" },
  { slug: "plumbing", name: "Plumbing & HVAC", stripName: "Plumbing & HVAC", description: "Dispatch technicians, track parts inventory, and automate follow-up appointments effortlessly.", category: "home", iconImg: "/images/landing/icons/icon-plumbing.png", industryImg: "/images/landing/icons/industry-plumbing.png" },
  { slug: "electrical", name: "Electrical Services", stripName: "Electrical", description: "Handle permits, inspections, and job costing with intelligent automation for electrical contractors.", category: "home", iconImg: "/images/landing/icons/icon-electrical.png", industryImg: "/images/landing/icons/industry-electrical.png" },
  { slug: "handyman", name: "Handyman Services", stripName: "Handyman", description: "Quote jobs, manage multiple trades, and get paid faster with one integrated platform.", category: "home", iconImg: "/images/landing/icons/icon-handyman.png", industryImg: "/images/landing/icons/industry-handyman.png" },
  { slug: "junk-removal", name: "Junk Removal", stripName: "Junk Removal", description: "Quote on-site, manage truck routes, and automate customer communication effortlessly.", category: "home", iconImg: "/images/landing/icons/icon-junk-removal.png", industryImg: "/images/landing/icons/industry-junk-removal.png" },
  { slug: "dumpster-rental", name: "Dumpster Rental", stripName: "Dumpster Rental", description: "Track inventory, book deliveries, schedule pickups, and manage billing seamlessly.", category: "home", iconImg: "/images/landing/icons/icon-dumpster.png", industryImg: "/images/landing/icons/industry-dumpster.png" },
  { slug: "moving-services", name: "Moving Services", stripName: "Moving", description: "Estimate jobs, coordinate crews, and manage seasonal demand with intelligent automation.", category: "home", iconImg: "/images/landing/icons/icon-moving.png", industryImg: "/images/landing/icons/industry-moving.png" },
  { slug: "locksmith", name: "Locksmith Services", stripName: "Locksmith", description: "Dispatch technicians, manage emergency calls, track inventory, and automate customer follow-ups.", category: "home", iconImg: "/images/landing/icons/icon-locksmith.png", industryImg: "/images/landing/icons/industry-locksmith.png" },
  { slug: "dog-poop-removal", name: "Dog Poop Removal", stripName: "Pet Waste Removal", description: "Recurring routes, customer portals, and automated billing for pet waste services.", category: "local", iconImg: "/images/landing/icons/icon-pet-waste.png", industryImg: "/images/landing/icons/industry-dog-waste.png" },
  { slug: "landscaping", name: "Landscaping & Lawn Care", stripName: "Landscaping", description: "Manage seasonal contracts, crew schedules, and equipment maintenance with automated workflows.", category: "local", iconImg: "/images/landing/icons/icon-landscaping.png", industryImg: "/images/landing/icons/industry-landscaping.png" },
  { slug: "pool-service", name: "Pool Service", stripName: "Pool Service", description: "Route optimization, chemical tracking, and recurring billing for pool maintenance professionals.", category: "local", iconImg: "/images/landing/icons/icon-pool.png", industryImg: "/images/landing/icons/industry-pool.png" },
  { slug: "pest-control", name: "Pest Control", stripName: "Pest Control", description: "Schedule treatments, manage recurring services, and automate customer reminders.", category: "local", iconImg: "/images/landing/icons/icon-pest-control.png", industryImg: "/images/landing/icons/industry-pest-control-BDtom-Gn.png" },
  { slug: "window-cleaning", name: "Window Cleaning", stripName: "Window Cleaning", description: "Manage residential and commercial routes with recurring service automation.", category: "local", iconImg: "/images/landing/icons/icon-window-cleaning.png", industryImg: "/images/landing/icons/industry-window-cleaning-DpW-n1wk.png" },
  { slug: "mobile-detailing", name: "Mobile Detailing", stripName: "Auto Detailing", description: "Route scheduling, upsells, automated reminders, and payment links for detailing teams.", category: "local", iconImg: "/images/landing/icons/icon-detailing.png", industryImg: "/images/landing/icons/industry-detailing-BveKnX-9.png" },
  { slug: "custom-printed-rugs", name: "Custom Printed Rugs", stripName: "Custom Rugs", description: "Capture requirements, manage approvals, track production, and keep customers updated.", category: "product", iconImg: "/images/landing/icons/icon-custom-rugs.png", industryImg: "/images/landing/icons/industry-custom-rugs.png" },
  { slug: "dna-testing", name: "DNA Testing", stripName: "DNA Testing", description: "Appointments, intake documentation, reminders, and reporting with a clean client experience.", category: "medical", iconImg: "/images/landing/icons/icon-dna-testing.png", industryImg: "/images/landing/icons/industry-dna-testing.png" },
  { slug: "mobile-drug-testing", name: "Mobile Drug Testing", stripName: "Drug Testing", description: "Employer requests, dispatch scheduling, standardized intake, and documentation workflows.", category: "medical", iconImg: "/images/landing/icons/icon-drug-testing.png", industryImg: "/images/landing/icons/industry-drug-testing-.png" },
  { slug: "diabetic-surplus", name: "Diabetic Supplies Surplus", stripName: "Diabetic Supplies", description: "Manage inventory, customer outreach, and compliance for surplus diabetic supply businesses.", category: "medical", iconImg: "/images/landing/icons/icon-diabetic.png", industryImg: "/images/landing/icons/industry-diabetic.png" },
  { slug: "trailer-rentals", name: "Trailer Rentals", stripName: "Trailer Rentals", description: "Manage reservations, track inventory, handle pickups and returns, and automate billing.", category: "rental", iconImg: "/images/landing/icons/icon-trailer-rentals.png", industryImg: "/images/landing/icons/industry-trailer-rentals.png" },
  { slug: "equipment-rentals", name: "Equipment Rentals", stripName: "Equipment Rentals", description: "Track equipment availability, manage bookings, handle maintenance schedules, and automate invoicing.", category: "rental", iconImg: "/images/landing/icons/icon-equipment-rentals.png", industryImg: "/images/landing/icons/industry-equipment-rentals.png" },
  { slug: "jump-house-rentals", name: "Jump House Rentals", stripName: "Jump Houses", description: "Book party rentals, manage delivery routes, handle setup schedules, and automate reminders.", category: "rental", iconImg: "/images/landing/icons/icon-jump-house-BqBC5-Wl.png", industryImg: "/images/landing/icons/industry-jump-house.png" },
];

export const heroSlides = industries.map((ind) => ({
  src: ind.industryImg,
  name: ind.name,
  slug: ind.slug,
  headline: `${ind.name} on Autopilot with Paper Flight`,
  description: ind.description,
  tag: ind.stripName,
}));

export const pricingPlans = [
  {
    name: "Starter",
    price: 29,
    description: "Perfect for solo operators just getting started.",
    features: ["Up to 50 jobs/month", "Basic scheduling", "Invoice generation", "Email notifications", "1 team member", "Mobile app access"],
    highlighted: false,
  },
  {
    name: "Professional",
    price: 79,
    description: "For growing businesses that need more power and automation.",
    features: ["Unlimited jobs", "Advanced scheduling", "Automated invoicing", "SMS notifications", "Team management (up to 10)", "Route optimization", "Priority support"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: 199,
    description: "For established businesses with complex needs.",
    features: ["Everything in Professional", "Unlimited team members", "Custom integrations", "API access", "Dedicated account manager", "Custom reporting", "SLA guarantee"],
    highlighted: false,
  },
];

export const features = [
  { title: "Smart Scheduling", desc: "AI-powered scheduling that learns your preferences and fills your calendar automatically." },
  { title: "Automated Invoicing", desc: "Send invoices automatically after every job. Get paid faster with online payments." },
  { title: "Customer Communication", desc: "Automated SMS and email reminders so customers never miss an appointment." },
  { title: "Team Management", desc: "Dispatch crews, track locations in real-time, and manage performance with ease." },
  { title: "Route Optimization", desc: "Save fuel and time with AI-optimized routes for all your field technicians." },
  { title: "Analytics & Reporting", desc: "Actionable insights to track revenue, team performance, and customer satisfaction." },
];

export const testimonials = [
  { quote: "Paper Flight cut our admin time in half. We're booking more jobs and spending less time on paperwork.", author: "Sarah Chen", role: "Owner, Sparkle Clean Co.", industry: "House Cleaning" },
  { quote: "The automated scheduling and route optimization have been game-changers for our landscaping crews.", author: "Marcus Johnson", role: "Operations Manager, GreenScape LLC", industry: "Landscaping" },
  { quote: "Our customers love the automatic reminders and easy online booking. We've reduced no-shows by 60%.", author: "Emily Rodriguez", role: "Founder, Pawfect Grooming", industry: "Pet Grooming" },
];
