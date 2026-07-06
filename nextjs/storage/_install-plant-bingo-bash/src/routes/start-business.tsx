import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import heroImg from "@/assets/start-business-hero.jpg";
import {
  Check,
  Sparkles,
  CreditCard,
  ShieldCheck,
  Receipt,
  RefreshCcw,
  BarChart3,
  FileText,
  CalendarDays,
  Ticket,
  QrCode,
  Users,
  Sprout,
  UserCog,
  Building2,
  Handshake,
  Tag,
  Mail,
  MessageSquare,
  LineChart,
  Palette,
  Layout,
  Type,
  Image as ImageIcon,
  Link2,
  MapPin,
  Search,
  TrendingUp,
  Gift,
  Cake,
  Star,
  Repeat,
  BookOpen,
  Calculator,
  Megaphone,
  Video,
  ChevronDown,
  ArrowRight,
  X,
  Store,
  Heart,
  Utensils,
  Smartphone,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/start-business")({
  component: StartBusinessPage,
  head: () => ({
    meta: [
      { title: "Start Your Own Plant Bingo Business — Greenhouse Bingo" },
      {
        name: "description",
        content:
          "Launch a branded Plant Bingo business in minutes. Website, ticketing, Stripe payouts, QR check-in, and marketing — all for $97/month.",
      },
      { property: "og:title", content: "Start Your Own Plant Bingo Business" },
      {
        property: "og:description",
        content:
          "The all-in-one platform to launch, market, and grow a profitable Plant Bingo business. $97/month.",
      },
      { property: "og:type", content: "product" },
      { property: "og:url", content: "/start-business" },
    ],
    links: [{ rel: "canonical", href: "/start-business" }],
  }),
});

function StartBusinessPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <Hero />
      <BrandSection />
      <StripeSection />
      <PlatformSection />
      <CustomizeSection />
      <AnalyticsSection />
      <GrowSection />
      <ResourcesSection />
      <CalculatorSection />
      <WhySection />
      <PricingSection />
      <TestimonialsSection />
      <FaqSection />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="People playing Plant Bingo in a greenhouse"
          className="h-full w-full object-cover"
          width={1600}
          height={1024}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-forest-deep/85 via-forest/70 to-forest-deep/85" />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 pt-16 pb-24 lg:grid-cols-[1.3fr_1fr] lg:gap-16 lg:px-8 lg:pt-24 lg:pb-32">
        <div className="text-cream animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-lime/20 border border-lime/40 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lime">
            <Sparkles className="h-3.5 w-3.5" /> White-Label Platform
          </span>
          <h1 className="mt-6 text-5xl font-black leading-[1.02] md:text-6xl lg:text-7xl">
            Start Your Own <span className="text-gradient-forest">Plant Bingo</span> Business
          </h1>
          <p className="mt-6 max-w-xl text-lg text-cream/85 md:text-xl">
            Launch your own branded Plant Bingo website, sell tickets online, collect payments
            instantly, and manage every aspect of your business from one powerful dashboard.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-full bg-lime px-7 py-4 text-base font-bold text-forest-deep shadow-glow transition hover:-translate-y-0.5"
            >
              Start My Free Trial <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full glass px-7 py-4 text-base font-bold text-cream border border-white/40 hover:bg-white/10"
            >
              Schedule a Demo
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-cream/90">
            {["No Setup Fees", "Cancel Anytime", "Powered by Greenhouse Bingo"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-lime" /> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Price card */}
        <div className="animate-bloom">
          <div className="rounded-3xl bg-cream/95 p-8 shadow-lifted backdrop-blur border border-white/60">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-forest">
              <Sprout className="h-4 w-4" /> Business Portal
            </div>
            <p className="mt-1 text-sm font-semibold text-forest-deep/70">Starting at</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-6xl font-black text-forest-deep">$97</span>
              <span className="text-lg font-semibold text-muted-foreground">/month</span>
            </div>
            <p className="mt-3 text-sm text-forest-deep/80">
              Everything you need to run a successful Plant Bingo business.
            </p>
            <div className="my-6 h-px w-full bg-border" />
            <ul className="space-y-2.5 text-sm text-forest-deep">
              {[
                "Unlimited events & ticket sales",
                "Fully branded website",
                "Stripe payouts to your bank",
                "QR check-in & customer portal",
                "Marketing, SMS & email tools",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-forest" /> {t}
                </li>
              ))}
            </ul>
            <a
              href="#pricing"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-bold text-cream transition hover:bg-forest-deep"
            >
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------- SECTION HEADER --------------- */
function SectionHeader({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-forest-deep">
        <Sparkles className="h-3.5 w-3.5 text-forest" /> {eyebrow}
      </span>
      <h2 className="mt-4 text-4xl font-black text-forest-deep md:text-5xl">{title}</h2>
      {subtitle && <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/* --------------- BRAND --------------- */
function BrandSection() {
  const items = [
    "Business Name", "Logo", "Brand Colors", "Homepage", "Hero Images",
    "About Page", "Contact Info", "FAQs", "Sponsors", "Social Media",
    "Event Locations", "Pricing", "Terms & Privacy", "Email Templates",
  ];
  return (
    <section className="bg-gradient-to-b from-cream to-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          {/* Left illustration */}
          <div className="relative">
            <div className="relative grid grid-cols-2 gap-4">
              {[
                { name: "Fern & Fable", color: "bg-forest", accent: "bg-lime" },
                { name: "Petal Palace", color: "bg-blossom", accent: "bg-sunny" },
                { name: "Sprout Society", color: "bg-sky-blue", accent: "bg-cream" },
                { name: "Verde Bingo Co.", color: "bg-tomato", accent: "bg-cream" },
              ].map((b, i) => (
                <div
                  key={b.name}
                  className={`rounded-3xl bg-white p-4 shadow-lifted border border-border ${i % 2 ? "translate-y-6" : ""}`}
                >
                  <div className={`h-24 rounded-2xl ${b.color} flex items-center justify-center`}>
                    <div className={`h-10 w-10 rounded-full ${b.accent}`} />
                  </div>
                  <div className="mt-3 text-sm font-black text-forest-deep">{b.name}</div>
                  <div className="mt-1 h-2 w-3/4 rounded-full bg-muted" />
                  <div className="mt-2 h-2 w-1/2 rounded-full bg-muted" />
                  <div className="mt-4 h-8 rounded-full bg-secondary" />
                </div>
              ))}
            </div>
            <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-lime/40 blur-2xl" />
          </div>

          <div>
            <SectionHeader
              eyebrow="Your Business. Your Brand."
              title={<>Every customer gets a <span className="text-gradient-forest">completely branded</span> website</>}
              subtitle="Launch under your own name with a site that looks like it was custom-built for your greenhouse — no code, no designers, no delays."
              center={false}
            />
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((i) => (
                <div key={i} className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm font-semibold text-forest-deep shadow-soft">
                  <Check className="h-4 w-4 text-forest" /> {i}
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm font-semibold text-forest">
              ✨ Everything editable without coding.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------- STRIPE --------------- */
function StripeSection() {
  const features = [
    { icon: CreditCard, title: "Instant Payments", desc: "Ticket revenue lands in your bank quickly." },
    { icon: ShieldCheck, title: "Secure Checkout", desc: "Best-in-class fraud protection." },
    { icon: ShieldCheck, title: "PCI Compliant", desc: "Stripe handles all card data securely." },
    { icon: RefreshCcw, title: "Refund Management", desc: "One-click refunds and disputes." },
    { icon: BarChart3, title: "Financial Reporting", desc: "Real-time revenue dashboards." },
    { icon: Receipt, title: "Tax Reporting", desc: "1099-K & year-end exports." },
  ];
  return (
    <section className="relative bg-forest-deep py-24 text-cream md:py-32 overflow-hidden">
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-lime/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blossom/20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-lime/20 border border-lime/40 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lime">
              <CreditCard className="h-3.5 w-3.5" /> Payments
            </span>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">Get Paid Instantly</h2>
            <p className="mt-4 max-w-xl text-lg text-cream/80">
              Connect your own Stripe account in one click. Every ticket sold is deposited directly
              into your bank — never through us.
            </p>

            <div className="mt-8 rounded-3xl glass-dark p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-lime text-forest-deep font-black">S</div>
                  <div>
                    <div className="font-bold">Stripe Account</div>
                    <div className="text-xs text-cream/70">Connected · Payouts enabled</div>
                  </div>
                </div>
                <span className="rounded-full bg-lime px-3 py-1 text-xs font-bold text-forest-deep">Active</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[["Today", "$1,240"], ["This Week", "$8,410"], ["This Month", "$32,900"]].map(([l, v]) => (
                  <div key={l} className="rounded-2xl bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-widest text-cream/60">{l}</div>
                    <div className="mt-1 text-lg font-black">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl glass-dark p-5 hover:-translate-y-1 transition">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-lime/20 text-lime">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 font-bold">{f.title}</div>
                <div className="mt-1 text-sm text-cream/70">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------- PLATFORM --------------- */
function PlatformSection() {
  const cards = [
    { icon: CalendarDays, title: "Event Management", desc: "Create unlimited Plant Bingo events." },
    { icon: Ticket, title: "Ticket Sales", desc: "Sell tickets online 24/7." },
    { icon: QrCode, title: "QR Code Check-In", desc: "Fast registration using QR codes." },
    { icon: Users, title: "Customer Management", desc: "Manage customers and registrations." },
    { icon: Sprout, title: "Plant Inventory", desc: "Track every plant before and after events." },
    { icon: UserCog, title: "Staff Management", desc: "Assign staff to events." },
    { icon: Building2, title: "Venue Management", desc: "Manage multiple locations." },
    { icon: Handshake, title: "Sponsors", desc: "Display and manage local sponsors." },
    { icon: Tag, title: "Coupons", desc: "Create discounts and promotions." },
    { icon: Mail, title: "Email Marketing", desc: "Reminders and promotions built-in." },
    { icon: MessageSquare, title: "SMS Notifications", desc: "Notify attendees instantly." },
    { icon: LineChart, title: "Reporting", desc: "Financial and attendance reports." },
  ];
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Business Platform"
          title={<>One dashboard to run <span className="text-gradient-forest">your entire business</span></>}
          subtitle="Purpose-built for Plant Bingo operators. Everything from ticket sales to plant inventory in a single beautiful interface."
        />

        {/* Dashboard mock */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-border bg-white shadow-lifted">
          <div className="flex items-center gap-2 border-b border-border bg-cream px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-tomato" />
              <span className="h-3 w-3 rounded-full bg-sunny" />
              <span className="h-3 w-3 rounded-full bg-lime" />
            </div>
            <div className="ml-2 flex-1 rounded-full bg-white px-3 py-1 text-xs text-muted-foreground">
              yourbingo.com/admin
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
            <aside className="hidden border-r border-border bg-cream/50 p-4 md:block">
              {["Dashboard", "Events", "Tickets", "Customers", "Plants", "Marketing", "Reports"].map((i, idx) => (
                <div key={i} className={`mb-1 rounded-xl px-3 py-2 text-sm font-semibold ${idx === 0 ? "bg-forest text-cream" : "text-forest-deep hover:bg-white"}`}>
                  {i}
                </div>
              ))}
            </aside>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[["Revenue", "$32,900", "+18%"], ["Tickets", "1,204", "+9%"], ["Events", "14", "+3"]].map(([l, v, d]) => (
                  <div key={l} className="rounded-2xl border border-border bg-cream/40 p-4">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{l}</div>
                    <div className="mt-2 text-2xl font-black text-forest-deep">{v}</div>
                    <div className="mt-1 text-xs font-semibold text-forest">{d}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-12 gap-1 h-32 items-end">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="rounded-t bg-gradient-to-t from-forest to-lime" style={{ height: `${20 + Math.abs(Math.sin(i)) * 80}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.title} className="group rounded-3xl border border-border bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lifted">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-forest transition group-hover:bg-forest group-hover:text-cream">
                <c.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-lg font-black text-forest-deep">{c.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- CUSTOMIZE --------------- */
function CustomizeSection() {
  const groups: { icon: React.ComponentType<{ className?: string }>; title: string; items: string[] }[] = [
    { icon: Layout, title: "Design", items: ["Website Design", "Homepage", "Navigation", "Footer", "Hero Images"] },
    { icon: Palette, title: "Brand", items: ["Brand Colors", "Typography", "Logo", "Photo Galleries"] },
    { icon: Ticket, title: "Ticketing", items: ["QR Tickets", "Ticket Pricing", "Event Categories", "Coupons"] },
    { icon: Mail, title: "Marketing", items: ["Email Templates", "Blog", "FAQs", "SEO Settings"] },
    { icon: Link2, title: "Connect", items: ["Social Links", "Sponsors", "Maps", "Contact Info"] },
    { icon: FileText, title: "Business", items: ["Policies", "Forms", "Analytics", "Domain"] },
  ];
  return (
    <section className="bg-gradient-to-b from-cream via-secondary/40 to-cream py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Everything Is Customizable"
          title={<>Design, edit, and launch — <span className="text-gradient-forest">no code needed</span></>}
          subtitle="Change any part of your site or business from one easy admin dashboard."
        />
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title} className="rounded-3xl border border-border bg-white p-6 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-lime/30 text-forest-deep">
                  <g.icon className="h-5 w-5" />
                </div>
                <div className="text-lg font-black text-forest-deep">{g.title}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {g.items.map((i) => (
                  <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-forest-deep">{i}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- ANALYTICS --------------- */
function AnalyticsSection() {
  const metrics = [
    "Revenue", "Monthly Ticket Sales", "Events Created", "Attendance",
    "Returning Customers", "Average Ticket Value", "Extra Card Sales",
    "Plant Distribution", "Conversion Rate", "Website Visitors",
    "Customer LTV", "Email Performance", "SMS Performance", "Repeat Purchases",
    "Top Cities", "Top Venues", "Popular Events", "Popular Plants",
    "Revenue by Month", "Revenue by State", "Revenue by City",
  ];
  return (
    <section className="bg-forest-deep py-24 text-cream md:py-32 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-lime/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-lime/20 border border-lime/40 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lime">
            <BarChart3 className="h-3.5 w-3.5" /> Analytics Dashboard
          </span>
          <h2 className="mt-4 text-4xl font-black md:text-5xl">See every number that matters</h2>
          <p className="mt-4 text-lg text-cream/80">Real-time insights that turn data into decisions.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl glass-dark p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-cream/70">Revenue Over Time</div>
                <div className="mt-2 text-4xl font-black">$412,890</div>
                <div className="text-sm text-lime">▲ 24.6% vs last quarter</div>
              </div>
              <div className="flex gap-2">
                {["1M", "3M", "1Y"].map((t, i) => (
                  <span key={t} className={`rounded-full px-3 py-1 text-xs font-bold ${i === 1 ? "bg-lime text-forest-deep" : "bg-white/10"}`}>{t}</span>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 400 140" className="mt-6 w-full">
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.82 0.19 130)" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="oklch(0.82 0.19 130)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,110 C40,90 60,60 90,70 C120,80 140,40 170,45 C200,50 220,20 260,30 C300,40 320,15 360,20 L400,25 L400,140 L0,140 Z"
                fill="url(#rev)"
              />
              <path
                d="M0,110 C40,90 60,60 90,70 C120,80 140,40 170,45 C200,50 220,20 260,30 C300,40 320,15 360,20 L400,25"
                fill="none"
                stroke="oklch(0.82 0.19 130)"
                strokeWidth="2.5"
              />
            </svg>
          </div>

          <div className="rounded-3xl glass-dark p-6">
            <div className="text-xs uppercase tracking-widest text-cream/70">Top Cities</div>
            <div className="mt-4 space-y-3">
              {[["Portland", 92], ["Austin", 78], ["Denver", 66], ["Nashville", 54], ["Raleigh", 41]].map(([c, v]) => (
                <div key={c as string}>
                  <div className="flex justify-between text-sm"><span>{c}</span><span className="font-bold">{v}%</span></div>
                  <div className="mt-1 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-lime" style={{ width: `${v}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {metrics.map((m) => (
            <span key={m} className="rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold">{m}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- GROW --------------- */
function GrowSection() {
  const items = [
    { icon: CalendarDays, title: "Upcoming Event Invitations" },
    { icon: Cake, title: "Birthday Promotions" },
    { icon: Gift, title: "Holiday Specials" },
    { icon: Megaphone, title: "New Event Announcements" },
    { icon: Sprout, title: "Plant Care Tips" },
    { icon: Star, title: "VIP Customer Lists" },
    { icon: Mail, title: "Email Campaigns" },
    { icon: MessageSquare, title: "SMS Campaigns" },
    { icon: Handshake, title: "Referral Rewards" },
    { icon: Repeat, title: "Loyalty Program" },
    { icon: Star, title: "Customer Reviews" },
    { icon: FileText, title: "Follow-up Surveys" },
  ];
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Grow Your Business"
          title={<>Turn one event into <span className="text-gradient-forest">hundreds of repeat customers</span></>}
          subtitle="Automations do the marketing for you — bringing guests back again and again."
        />
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => (
            <div key={i.title} className="rounded-2xl border border-border bg-gradient-to-br from-white to-secondary/40 p-5 shadow-soft transition hover:-translate-y-1">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-cream">
                <i.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-bold text-forest-deep">{i.title}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- RESOURCES --------------- */
function ResourcesSection() {
  const items: { icon: typeof Sprout; title: string }[] = [
    { icon: Sprout, title: "Plant Supplier Directory" },
    { icon: Ticket, title: "Bingo Equipment Suppliers" },
    { icon: Layout, title: "Bingo Cards & Markers" },
    { icon: BookOpen, title: "Complete Startup Guide" },
    { icon: FileText, title: "Event Planning Checklist" },
    { icon: Calculator, title: "Revenue & Profit Calculator" },
    { icon: Megaphone, title: "Marketing Templates" },
    { icon: Mail, title: "Email Campaign Templates" },
    { icon: Smartphone, title: "Social Media Graphics" },
    { icon: Video, title: "Training Videos" },
    { icon: BookOpen, title: "Knowledge Base" },
    { icon: MessageSquare, title: "Event Scripts" },
    { icon: Tag, title: "Plant Pricing Guide" },
    { icon: Store, title: "Supply Vendor Recommendations" },
    { icon: Handshake, title: "Partner Discounts" },
    { icon: Receipt, title: "Printable Event Forms" },
  ];
  return (
    <section className="bg-gradient-to-b from-secondary/40 to-cream py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Starter Resources"
          title={<>Everything you need to <span className="text-gradient-forest">launch successfully</span></>}
          subtitle="A complete library of tools, guides, and templates — professionally organized."
        />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => (
            <div key={i.title} className="group rounded-3xl border border-border bg-white p-5 shadow-soft transition hover:-translate-y-1 hover:shadow-lifted">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-cream">
                <i.icon className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-black text-forest-deep">{i.title}</div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-forest opacity-0 transition group-hover:opacity-100">
                Open <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


/* --------------- CALCULATOR --------------- */
function CalculatorSection() {
  const [ticketPrice, setTicketPrice] = useState(30);
  const [attendance, setAttendance] = useState(80);
  const [extraCards, setExtraCards] = useState(40);
  const [plantCost, setPlantCost] = useState(6);
  const [venue, setVenue] = useState(300);
  const [staff, setStaff] = useState(200);
  const [marketing, setMarketing] = useState(150);
  const [fb, setFb] = useState(100);
  const [supplies, setSupplies] = useState(75);
  const [eventsPerMonth, setEventsPerMonth] = useState(4);

  const calc = useMemo(() => {
    const grossTickets = ticketPrice * attendance;
    const grossExtras = extraCards * 5;
    const gross = grossTickets + grossExtras;
    const fees = gross * 0.035;
    const plants = plantCost * attendance;
    const expenses = plants + venue + staff + marketing + fb + supplies;
    const net = gross - expenses;
    const perGuest = attendance ? net / attendance : 0;
    return {
      gross,
      expenses,
      fees,
      net,
      perGuest,
      monthly: net * eventsPerMonth,
      annual: net * eventsPerMonth * 12,
    };
  }, [ticketPrice, attendance, extraCards, plantCost, venue, staff, marketing, fb, supplies, eventsPerMonth]);

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const inputs: [string, number, (n: number) => void, string][] = [
    ["Ticket Price", ticketPrice, setTicketPrice, "$"],
    ["Expected Attendance", attendance, setAttendance, ""],
    ["Extra Bingo Cards Sold", extraCards, setExtraCards, ""],
    ["Average Plant Cost", plantCost, setPlantCost, "$"],
    ["Venue Cost", venue, setVenue, "$"],
    ["Staff Cost", staff, setStaff, "$"],
    ["Marketing Cost", marketing, setMarketing, "$"],
    ["Food & Beverage", fb, setFb, "$"],
    ["Supplies", supplies, setSupplies, "$"],
    ["Events Per Month", eventsPerMonth, setEventsPerMonth, ""],
  ];

  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Profit Calculator"
          title={<>See how much you could <span className="text-gradient-forest">make per event</span></>}
          subtitle="Adjust the inputs to project your revenue, expenses, and profit."
        />
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-border bg-white p-6 shadow-soft md:p-8">
            <div className="flex items-center gap-2 text-forest">
              <Calculator className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-widest">Inputs</span>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {inputs.map(([label, value, setter, prefix]) => (
                <label key={label} className="block">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
                  <div className="mt-1 flex items-center rounded-2xl border border-input bg-cream/40 px-3 focus-within:border-forest">
                    {prefix && <span className="text-forest-deep font-semibold">{prefix}</span>}
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => setter(Number(e.target.value) || 0)}
                      className="w-full bg-transparent px-2 py-2.5 text-lg font-bold text-forest-deep outline-none"
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-forest to-forest-deep p-6 text-cream shadow-lifted md:p-8">
            <div className="flex items-center gap-2 text-lime">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-widest">Projection</span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Stat label="Gross Revenue" value={fmt(calc.gross)} />
              <Stat label="Total Expenses" value={fmt(calc.expenses)} />
              <Stat label="Processing Fees" value={fmt(calc.fees)} />
              <Stat label="Profit / Guest" value={fmt(calc.perGuest)} />
            </div>
            <div className="mt-6 rounded-2xl bg-lime p-6 text-forest-deep">
              <div className="text-xs font-bold uppercase tracking-widest">Net Profit / Event</div>
              <div className="mt-1 text-5xl font-black">{fmt(calc.net)}</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-xs uppercase tracking-widest text-cream/70">Monthly</div>
                <div className="text-2xl font-black">{fmt(calc.monthly)}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-xs uppercase tracking-widest text-cream/70">Annual</div>
                <div className="text-2xl font-black">{fmt(calc.annual)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <div className="text-xs uppercase tracking-widest text-cream/70">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}

/* --------------- WHY --------------- */
function WhySection() {
  const rows = [
    "Complete Website", "Payments & Payouts", "Ticketing Software", "QR Code System",
    "Customer Accounts", "Analytics", "Email Marketing", "SMS Notifications",
    "Inventory Tracking", "Event Management", "Ongoing Updates", "Support",
  ];
  return (
    <section className="bg-cream py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Why Greenhouse Bingo"
          title={<>Skip <span className="text-gradient-forest">18 months of building</span></>}
          subtitle="Instead of hiring developers and duct-taping tools together, get everything in one platform."
        />
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-white p-8 shadow-soft">
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Build It Yourself</div>
            <div className="mt-2 text-2xl font-black text-forest-deep">$50k+ & 12–18 months</div>
            <ul className="mt-6 space-y-3 text-sm">
              {rows.map((r) => (
                <li key={r} className="flex items-center gap-3 text-muted-foreground">
                  <X className="h-4 w-4 text-tomato" /> {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border-2 border-forest bg-gradient-to-br from-forest to-forest-deep p-8 text-cream shadow-lifted relative overflow-hidden">
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-lime/30 blur-3xl" />
            <div className="text-xs font-bold uppercase tracking-widest text-lime">Greenhouse Bingo</div>
            <div className="mt-2 text-2xl font-black">$97 / month · Live today</div>
            <ul className="mt-6 space-y-3 text-sm">
              {rows.map((r) => (
                <li key={r} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-lime" /> {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------- PRICING --------------- */
function PricingSection() {
  const shared = [
    "Unlimited Events", "Unlimited Customers", "Unlimited Ticket Sales",
    "Unlimited QR Codes", "Complete Branded Website", "Stripe Integration",
    "Customer Portal", "Admin Dashboard", "Event Calendar", "Analytics",
    "Email Marketing", "SMS Notifications", "Plant Inventory",
    "Revenue Calculator", "Marketing Resources", "Training Library",
    "Knowledge Base", "Automatic Software Updates", "Technical Support",
  ];
  const plans = [
    {
      name: "Starter",
      price: "$97",
      tagline: "Perfect for growing operators managing a focused footprint.",
      highlight: "Up to 10 separate venues",
      cta: "Start with Starter",
      featured: false,
    },
    {
      name: "Unlimited",
      price: "$197",
      tagline: "Scale statewide (or nationwide) with no venue ceiling.",
      highlight: "Unlimited venues",
      cta: "Go Unlimited",
      featured: true,
    },
  ];
  return (
    <section id="pricing" className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Simple Pricing"
          title={<>Two plans. <span className="text-gradient-forest">Pick your scale.</span></>}
          subtitle="Both plans include the full platform. The only difference is how many venues you can run under your brand."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative overflow-hidden rounded-[2rem] border-2 bg-white shadow-lifted ${
                p.featured ? "border-forest ring-4 ring-lime/30" : "border-border"
              }`}
            >
              {p.featured && (
                <div className="absolute right-6 top-6 rounded-full bg-lime px-3 py-1 text-[10px] font-black uppercase tracking-widest text-forest-deep">
                  Most Popular
                </div>
              )}
              <div className={`p-8 text-center ${p.featured ? "bg-gradient-to-br from-forest to-forest-deep text-cream" : "bg-cream/60 text-forest-deep"}`}>
                <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${p.featured ? "bg-lime/20 border border-lime/40 text-lime" : "bg-secondary text-forest-deep"}`}>
                  <Sprout className="h-3.5 w-3.5" /> {p.name}
                </div>
                <h3 className="mt-4 text-2xl font-black md:text-3xl">Plant Bingo · {p.name}</h3>
                <div className="mt-5 flex items-end justify-center gap-2">
                  <span className="text-6xl font-black">{p.price}</span>
                  <span className={`mb-2 text-lg font-semibold ${p.featured ? "text-cream/80" : "text-muted-foreground"}`}>/month</span>
                </div>
                <p className={`mt-3 text-sm font-bold ${p.featured ? "text-lime" : "text-forest"}`}>
                  {p.highlight}
                </p>
                <p className={`mt-2 text-sm ${p.featured ? "text-cream/80" : "text-muted-foreground"}`}>{p.tagline}</p>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {shared.map((i) => (
                    <div key={i} className="flex items-center gap-2 text-sm font-semibold text-forest-deep">
                      <Check className="h-4 w-4 text-forest" /> {i}
                    </div>
                  ))}
                </div>
                <a
                  href="#demo"
                  className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold shadow-soft transition hover:-translate-y-0.5 ${
                    p.featured
                      ? "bg-lime text-forest-deep hover:bg-lime/90"
                      : "bg-forest text-cream hover:bg-forest-deep"
                  }`}
                >
                  {p.cta} <ArrowRight className="h-4 w-4" />
                </a>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  No setup fees · Cancel anytime · 14-day free trial
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Venue Value Proposition — why venues desperately want this */}
        <div className="mt-16">
          <SectionHeader
            eyebrow="Venue Partners"
            title={<>Why every venue <span className="text-gradient-forest">wants to host</span> Plant Bingo</>}
            subtitle="This is not just an event — it is a proven customer-acquisition and retention engine that costs the venue nothing."
          />

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: New Foot Traffic */}
            <div className="rounded-[2rem] border-2 border-forest/20 bg-gradient-to-br from-forest/5 to-cream p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lifted">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-forest text-cream">
                <Eye className="h-6 w-6" />
              </div>
              <h4 className="mt-5 text-xl font-black text-forest-deep">First-Time Visitors</h4>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Plant Bingo draws crowds who have <strong className="text-forest-deep">never stepped foot in your establishment</strong>. These are new faces walking through your door for the very first time — people who found you through our marketing, social buzz, or word-of-mouth, not through your usual channels.
              </p>
              <div className="mt-4 rounded-2xl bg-white/80 p-4 text-xs font-semibold text-forest-deep">
                "We had guests who drove 40 minutes and told us they did not know this place existed until they saw the Bingo event." — Venue Partner, Michigan
              </div>
            </div>

            {/* Card 2: Repeat Customers */}
            <div className="rounded-[2rem] border-2 border-lime/40 bg-gradient-to-br from-lime/10 to-cream p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lifted">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-lime text-forest-deep">
                <Heart className="h-6 w-6" />
              </div>
              <h4 className="mt-5 text-xl font-black text-forest-deep">Customers Who Come Back</h4>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Bingo night is not a one-and-done. Guests fall in love with the experience and <strong className="text-forest-deep">return week after week</strong> — often bringing friends, family, and coworkers. What starts as a Bingo night becomes a standing tradition that fills your slowest nights reliably.
              </p>
              <div className="mt-4 rounded-2xl bg-white/80 p-4 text-xs font-semibold text-forest-deep">
                Average venue sees 60–70% of Bingo guests return for a second event within 30 days.
              </div>
            </div>

            {/* Card 3: F&B Revenue */}
            <div className="rounded-[2rem] border-2 border-forest/20 bg-gradient-to-br from-forest/5 to-cream p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lifted">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-forest text-cream">
                <Utensils className="h-6 w-6" />
              </div>
              <h4 className="mt-5 text-xl font-black text-forest-deep">Food & Drink Sales Surge</h4>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Every Bingo guest is a captive audience for <strong className="text-forest-deep">2–3 hours</strong>. They order appetizers, drinks, desserts, and coffee while they play. Venues routinely report that Bingo nights generate <strong className="text-forest-deep">3–5x their normal per-head food and beverage revenue</strong> compared to a standard weeknight.
              </p>
              <div className="mt-4 rounded-2xl bg-white/80 p-4 text-xs font-semibold text-forest-deep">
                "Bingo night is now our highest-margin night of the week. The bar revenue alone covers our slow Monday staff costs." — Venue Manager, Ohio
              </div>
            </div>

            {/* Card 4: Social Proof & Buzz */}
            <div className="rounded-[2rem] border-2 border-forest/20 bg-gradient-to-br from-forest/5 to-cream p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lifted">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-forest text-cream">
                <Smartphone className="h-6 w-6" />
              </div>
              <h4 className="mt-5 text-xl font-black text-forest-deep">Free Social Media Marketing</h4>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Bingo nights are <strong className="text-forest-deep">inherently Instagram-worthy</strong>. Guests post photos of their plants, their cards, and your venue — tagging your location and driving organic reach you cannot buy. Every event becomes a mini marketing campaign that lives on social feeds for days.
              </p>
              <div className="mt-4 rounded-2xl bg-white/80 p-4 text-xs font-semibold text-forest-deep">
                Partner venues average 50+ organic Instagram tags per event — reaching thousands of local followers at zero ad spend.
              </div>
            </div>

            {/* Card 5: No Risk, No Cost */}
            <div className="rounded-[2rem] border-2 border-forest/20 bg-gradient-to-br from-forest/5 to-cream p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-lifted">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-forest text-cream">
                <Store className="h-6 w-6" />
              </div>
              <h4 className="mt-5 text-xl font-black text-forest-deep">Zero Cost. Zero Risk.</h4>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The venue pays <strong className="text-forest-deep">absolutely nothing</strong> to host Plant Bingo. We handle the ticketing, marketing, plant sourcing, event setup, and customer communication. You simply unlock your doors and watch new customers fill your seats — then ring up food and drink sales you would never have seen otherwise.
              </p>
              <div className="mt-4 rounded-2xl bg-white/80 p-4 text-xs font-semibold text-forest-deep">
                There is no upfront fee, no minimum guarantee, and no contract. If a night does not work for your schedule, we simply move the date.
              </div>
            </div>

            {/* Card 6: Dashboard & Tools */}
            <div className="rounded-[2rem] border-2 border-dashed border-forest/30 bg-cream/60 p-7 shadow-soft">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-forest text-cream">
                <Handshake className="h-6 w-6" />
              </div>
              <h4 className="mt-5 text-xl font-black text-forest-deep">Free Venue Dashboard</h4>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Every partner venue gets a free account to track seats sold, log in-house sales revenue, and see historical performance by event — so <strong className="text-forest-deep">everyone sees the ROI</strong> of hosting Plant Bingo. Venues can also request future dates with one click.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Live seat-sold tracking per event",
                  "Venue enters their own sales revenue",
                  "Historical performance by location",
                  "One-click request for future dates",
                ].map((v) => (
                  <li key={v} className="flex items-center gap-2 text-sm font-semibold text-forest-deep">
                    <Check className="h-4 w-4 text-forest" /> {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-forest/10 px-6 py-3 text-sm font-bold text-forest-deep">
              <Check className="h-4 w-4 text-forest" />
              All venue tools are included at no cost — the venue never pays a dime.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}


/* --------------- TESTIMONIALS --------------- */
function TestimonialsSection() {
  const t = [
    {
      name: "Marla Chen",
      title: "Owner, Fern & Fable Greenhouse",
      quote:
        "We sold out our first Plant Bingo night in 48 hours. Greenhouse Bingo made it feel like we had a full software team behind us.",
    },
    {
      name: "David Ortiz",
      title: "Founder, Sprout Society Events",
      quote:
        "The analytics alone are worth $97/month. I know exactly which cities to expand into and what plants sell best.",
    },
    {
      name: "Jenna Reeves",
      title: "Manager, Petal Palace Nursery",
      quote:
        "We turned slow weeknights into our highest-revenue events. Our regulars come back for every new theme.",
    },
  ];
  return (
    <section className="bg-gradient-to-b from-cream to-secondary/40 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeader
          eyebrow="Success Stories"
          title={<>Greenhouse owners <span className="text-gradient-forest">growing every week</span></>}
        />
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {t.map((x) => (
            <figure key={x.name} className="flex h-full flex-col rounded-3xl border border-border bg-white p-7 shadow-soft">
              <div className="flex gap-1 text-sunny">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-sunny" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-lg text-forest-deep">"{x.quote}"</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-forest text-cream font-black">
                  {x.name[0]}
                </div>
                <div>
                  <div className="font-bold text-forest-deep">{x.name}</div>
                  <div className="text-xs text-muted-foreground">{x.title}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- FAQ --------------- */
function FaqSection() {
  const faqs: [string, string][] = [
    ["Can I use my own branding?", "Yes. Every customer receives a fully branded website with their own logo, colors, typography, and content — editable without any code."],
    ["Can I connect my own Stripe account?", "Yes. Connect Stripe in one click and receive payouts directly to your bank."],
    ["Do I receive payments directly?", "Ticket revenue is deposited straight into your Stripe account — Greenhouse Bingo never touches your funds."],
    ["Can I host unlimited events?", "Yes. Every plan includes unlimited events, unlimited tickets, and unlimited customers."],
    ["Can I customize my website?", "Absolutely. Homepage, hero images, FAQs, sponsors, email templates, policies — all customizable from your admin."],
    ["Do I need technical experience?", "No. If you can edit a document, you can run a Plant Bingo business."],
    ["Can I manage multiple locations?", "Yes. The Starter plan includes up to 10 separate venues. The Unlimited plan lets you add as many venues as you like with no ceiling."],
    ["Is there a contract?", "No. Month-to-month, cancel anytime."],
    ["What support is included?", "Email + chat support, knowledge base, training videos, and automatic software updates."],
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <SectionHeader eyebrow="FAQ" title="Frequently asked questions" />
        <div className="mt-12 space-y-3">
          {faqs.map(([q, a], i) => (
            <div key={q} className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <span className="text-base font-bold text-forest-deep md:text-lg">{q}</span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-forest transition ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <div className="px-6 pb-6 text-muted-foreground">{a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------- FINAL CTA --------------- */
function FinalCta() {
  return (
    <section id="demo" className="relative overflow-hidden bg-gradient-to-br from-forest via-forest-deep to-forest py-24 text-cream md:py-32">
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[800px] rounded-full bg-lime/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-blossom/20 blur-3xl" />
      <div className="relative mx-auto max-w-4xl px-4 text-center lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full bg-lime/20 border border-lime/40 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-lime">
          <Sparkles className="h-3.5 w-3.5" /> Ready to Launch
        </span>
        <h2 className="mt-6 text-5xl font-black leading-[1.02] md:text-6xl">
          Launch Your Own Plant Bingo Business Today
        </h2>
        <p className="mt-6 text-lg text-cream/85 md:text-xl">
          Everything you need to build, market, manage, and grow a successful Plant Bingo business
          — starting at just $97/month.
        </p>
        <div className="mt-8 inline-flex items-baseline gap-4 rounded-full bg-cream/10 px-6 py-3">
          <span className="text-3xl font-black text-lime">$97/mo</span>
          <span className="text-cream/60">or</span>
          <span className="text-3xl font-black text-lime">$197/mo</span>
          <span className="text-cream/60">Unlimited</span>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="#pricing" className="inline-flex items-center gap-2 rounded-full bg-lime px-8 py-4 text-base font-bold text-forest-deep shadow-glow transition hover:-translate-y-0.5">
            Start Free Trial <ArrowRight className="h-4 w-4" />
          </a>
          <Link to="/contact" className="inline-flex items-center gap-2 rounded-full glass px-8 py-4 text-base font-bold text-cream border border-white/40 hover:bg-white/10">
            Book a Live Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
