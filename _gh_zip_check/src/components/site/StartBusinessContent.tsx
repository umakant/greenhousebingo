import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  X,
  Sparkles,
  Sprout,
  Eye,
  Heart,
  UtensilsCrossed,
  Smartphone,
  Store,
  Handshake,
  Calendar,
  Gift,
  PartyPopper,
  Megaphone,
  Leaf,
  Star,
  Mail,
  MessageSquare,
  Users,
  Award,
  MessageCircle,
  ClipboardList,
  BookOpen,
  LayoutGrid,
  FileText,
  Calculator,
  Video,
  Library,
  Image as ImageIcon,
  Tag,
  Truck,
  BadgePercent,
  Printer,
  BarChart3,
  TrendingUp,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import heroImage from "@/assets/greenhouse-hero.jpg";

/* ---------- HERO ---------- */
function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b border-border/60">
      <img
        src={heroImage}
        alt="Plant-filled greenhouse event"
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/90 via-primary/75 to-primary/60" />

      <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 md:py-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> White-label platform
        </div>
        <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-primary-foreground md:text-6xl lg:text-7xl">
          Start Your Own{" "}
          <span className="italic text-accent">Plant Bingo</span> Business
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/90 md:text-xl">
          Launch your own branded Plant Bingo website, sell tickets, collect
          payments, and manage every event — all from one dashboard.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="secondary" className="rounded-full">
            <Link to="/contact">
              Start Free Trial <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link to="/contact">Book a Live Demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- SECTION HEADER ---------- */
function SectionHeader({
  eyebrow,
  title,
  accent,
  subtitle,
  invert = false,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  subtitle?: string;
  invert?: boolean;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest ${
          invert
            ? "bg-accent/15 text-accent"
            : "bg-primary/10 text-primary"
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
      </div>
      <h2
        className={`mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl ${
          invert ? "text-primary-foreground" : ""
        }`}
      >
        {title} {accent && <span className="italic text-accent">{accent}</span>}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-lg ${
            invert ? "text-primary-foreground/80" : "text-muted-foreground"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ---------- SKIP 18 MONTHS ---------- */
const buildItems = [
  "Complete Website",
  "Payments & Payouts",
  "Ticketing Software",
  "QR Code System",
  "Customer Accounts",
  "Analytics",
  "Email Marketing",
  "SMS Notifications",
  "Inventory Tracking",
  "Event Management",
  "Ongoing Updates",
  "Support",
];

function SkipBuilding() {
  return (
    <section className="border-y border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="Why Greenhouse Bingo"
          title="Skip 18 months of"
          accent="building"
          subtitle="Instead of hiring developers and duct-taping tools together, get everything in one platform."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Build it yourself
            </div>
            <div className="mt-2 font-display text-3xl">$50k+ &amp; 12–18 months</div>
            <ul className="mt-6 space-y-3 text-sm">
              {buildItems.map((i) => (
                <li key={i} className="flex items-center gap-3">
                  <X className="h-5 w-5 flex-shrink-0 text-destructive" />
                  <span className="text-muted-foreground">{i}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-primary p-8 text-primary-foreground shadow-lift">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent">
              Greenhouse Bingo
            </div>
            <div className="mt-2 font-display text-3xl">$97 / month · Live today</div>
            <ul className="mt-6 space-y-3 text-sm">
              {buildItems.map((i) => (
                <li key={i} className="flex items-center gap-3">
                  <Check className="h-5 w-5 flex-shrink-0 text-accent" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- VENUE PARTNERS ---------- */
const venueCards = [
  {
    icon: Eye,
    title: "First-Time Visitors",
    copy: (
      <>
        Plant Bingo draws crowds who have{" "}
        <strong>never stepped foot in your establishment</strong>. These are new
        faces walking through your door for the very first time — people who
        found you through our marketing, social buzz, or word-of-mouth.
      </>
    ),
    quote:
      "\"We had guests who drove 40 minutes and told us they did not know this place existed until they saw the Bingo event.\" — Venue Partner, Michigan",
    featured: false,
  },
  {
    icon: Heart,
    title: "Customers Who Come Back",
    copy: (
      <>
        Bingo night is not a one-and-done. Guests fall in love with the
        experience and <strong>return week after week</strong> — often bringing
        friends, family, and coworkers.
      </>
    ),
    quote:
      "Average venue sees 60–70% of Bingo guests return for a second event within 30 days.",
    featured: true,
  },
  {
    icon: UtensilsCrossed,
    title: "Food & Drink Sales Surge",
    copy: (
      <>
        Every Bingo guest is a captive audience for <strong>2–3 hours</strong>.
        They order appetizers, drinks, desserts, and coffee while they play.
        Venues routinely report Bingo nights generate{" "}
        <strong>3–5× their normal per-head food and beverage revenue</strong>.
      </>
    ),
    quote:
      "\"Bingo night is now our highest-margin night of the week.\" — Venue Manager, Ohio",
    featured: false,
  },
  {
    icon: Smartphone,
    title: "Free Social Media Marketing",
    copy: (
      <>
        Bingo nights are <strong>inherently Instagram-worthy</strong>. Guests
        post photos of their plants, their cards, and your venue — tagging your
        location and driving organic reach you cannot buy.
      </>
    ),
    quote:
      "Partner venues average 50+ organic Instagram tags per event — reaching thousands of local followers at zero ad spend.",
    featured: false,
  },
  {
    icon: Store,
    title: "Zero Cost. Zero Risk.",
    copy: (
      <>
        The venue pays <strong>absolutely nothing</strong> to host Plant Bingo.
        We handle ticketing, marketing, plant sourcing, event setup, and
        customer communication. You simply unlock your doors and watch new
        customers fill your seats.
      </>
    ),
    quote:
      "No upfront fee, no minimum guarantee, no contract. If a night does not work for your schedule, we simply move the date.",
    featured: false,
  },
  {
    icon: Handshake,
    title: "Free Venue Dashboard",
    copy: (
      <>
        Every partner venue gets a free account to track seats sold, log
        in-house sales revenue, and see historical performance —{" "}
        <strong>everyone sees the ROI</strong> of hosting Plant Bingo.
      </>
    ),
    bullets: [
      "Live seat-sold tracking per event",
      "Venue enters their own sales revenue",
      "Historical performance by location",
      "One-click request for future dates",
    ],
    featured: false,
    dashed: true,
  },
];

function VenuePartners() {
  return (
    <section className="bg-[hsl(48_38%_94%)]">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="Venue partners"
          title="Why every venue"
          accent="wants to host Plant Bingo"
          subtitle="This is not just an event — it is a proven customer-acquisition and retention engine that costs the venue nothing."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {venueCards.map((c) => (
            <div
              key={c.title}
              className={`flex flex-col rounded-3xl p-7 shadow-soft ${
                c.featured
                  ? "bg-gradient-to-br from-accent/25 to-accent/5 ring-1 ring-accent/40"
                  : c.dashed
                    ? "border-2 border-dashed border-primary/40 bg-card"
                    : "border border-border bg-card"
              }`}
            >
              <div
                className={`grid h-12 w-12 place-items-center rounded-full ${
                  c.featured ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-2xl text-primary">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {c.copy}
              </p>
              {c.quote && (
                <div className="mt-5 rounded-xl bg-background/70 p-4 text-xs leading-relaxed text-foreground/80">
                  {c.quote}
                </div>
              )}
              {c.bullets && (
                <ul className="mt-5 space-y-2 text-sm">
                  {c.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-5 py-2.5 text-sm font-medium text-primary">
            <Check className="h-4 w-4" />
            All venue tools are included at no cost — the venue never pays a dime.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- GROW YOUR BUSINESS ---------- */
const automations = [
  { icon: Calendar, title: "Upcoming Event Invitations" },
  { icon: Gift, title: "Birthday Promotions" },
  { icon: PartyPopper, title: "Holiday Specials" },
  { icon: Megaphone, title: "New Event Announcements" },
  { icon: Leaf, title: "Plant Care Tips" },
  { icon: Star, title: "VIP Customer Lists" },
  { icon: Mail, title: "Email Campaigns" },
  { icon: MessageSquare, title: "SMS Campaigns" },
  { icon: Award, title: "Referral Rewards" },
  { icon: Users, title: "Loyalty Program" },
  { icon: MessageCircle, title: "Customer Reviews" },
  { icon: ClipboardList, title: "Follow-up Surveys" },
];

function GrowBusiness() {
  return (
    <section className="bg-[hsl(48_38%_94%)] border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="Grow your business"
          title="Turn one event into"
          accent="hundreds of repeat customers"
          subtitle="Automations do the marketing for you — bringing guests back again and again."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {automations.map((a) => (
            <div
              key={a.title}
              className="rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-5 shadow-soft transition-shadow hover:shadow-lift"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <a.icon className="h-4 w-4" />
              </div>
              <div className="mt-4 font-display text-lg text-primary">{a.title}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- STARTER RESOURCES ---------- */
const resources = [
  { icon: Sprout, title: "Plant Supplier Directory" },
  { icon: LayoutGrid, title: "Bingo Equipment Suppliers", cta: true },
  { icon: LayoutGrid, title: "Bingo Cards & Markers" },
  { icon: BookOpen, title: "Complete Startup Guide" },
  { icon: FileText, title: "Event Planning Checklist" },
  { icon: Calculator, title: "Revenue & Profit Calculator" },
  { icon: Megaphone, title: "Marketing Templates" },
  { icon: Mail, title: "Email Campaign Templates" },
  { icon: Smartphone, title: "Social Media Graphics" },
  { icon: Video, title: "Training Videos" },
  { icon: Library, title: "Knowledge Base" },
  { icon: MessageSquare, title: "Event Scripts" },
  { icon: Tag, title: "Plant Pricing Guide" },
  { icon: Truck, title: "Supply Vendor Recommendations" },
  { icon: BadgePercent, title: "Partner Discounts" },
  { icon: Printer, title: "Printable Event Forms" },
];

function Resources() {
  return (
    <section className="bg-[hsl(48_38%_94%)] border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="Starter resources"
          title="Everything you need to"
          accent="launch successfully"
          subtitle="A complete library of tools, guides, and templates — professionally organized."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {resources.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <r.icon className="h-4 w-4" />
              </div>
              <div className="mt-4 font-display text-lg text-primary">{r.title}</div>
              {r.cta && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-primary">
                  Open <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- ANALYTICS DASHBOARD ---------- */
const topCities = [
  { name: "Portland", pct: 92 },
  { name: "Austin", pct: 78 },
  { name: "Denver", pct: 66 },
  { name: "Nashville", pct: 54 },
  { name: "Raleigh", pct: 41 },
];

const metricBadges = [
  "Revenue",
  "Monthly Ticket Sales",
  "Events Created",
  "Attendance",
  "Returning Customers",
  "Average Ticket Value",
  "Extra Card Sales",
  "Plant Distribution",
  "Conversion Rate",
  "Website Visitors",
  "Customer LTV",
  "Email Performance",
  "SMS Performance",
  "Repeat Purchases",
  "Top Cities",
  "Top Venues",
  "Popular Events",
  "Popular Plants",
  "Revenue by Source",
  "Revenue by City",
];

function AnalyticsDashboard() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="Analytics dashboard"
          title="See every number that"
          accent="matters"
          subtitle="Real-time insights that turn data into decisions."
          invert
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Revenue chart card */}
          <div className="rounded-3xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-7">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
                  Revenue over time
                </div>
                <div className="mt-3 font-display text-5xl">$412,890</div>
                <div className="mt-1 inline-flex items-center gap-1 text-sm text-accent">
                  <TrendingUp className="h-4 w-4" /> 24.6% vs last quarter
                </div>
              </div>
              <div className="flex gap-1 rounded-full bg-primary-foreground/10 p-1 text-xs">
                {["1M", "3M", "1Y"].map((r, i) => (
                  <button
                    key={r}
                    className={`rounded-full px-3 py-1 ${
                      i === 1
                        ? "bg-accent text-accent-foreground"
                        : "text-primary-foreground/70"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 400 160" className="mt-6 h-40 w-full">
              <defs>
                <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(84 81% 54%)" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="hsl(84 81% 54%)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M0,130 C40,120 60,105 90,95 C130,82 160,90 200,72 C240,55 270,60 310,45 C340,35 370,30 400,25 L400,160 L0,160 Z"
                fill="url(#chartFill)"
              />
              <path
                d="M0,130 C40,120 60,105 90,95 C130,82 160,90 200,72 C240,55 270,60 310,45 C340,35 370,30 400,25"
                fill="none"
                stroke="hsl(84 81% 54%)"
                strokeWidth="2.5"
              />
            </svg>
          </div>

          {/* Top cities */}
          <div className="rounded-3xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-7">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
              Top cities
            </div>
            <div className="mt-6 space-y-5">
              {topCities.map((c) => (
                <div key={c.name}>
                  <div className="flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="font-medium">{c.pct}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-foreground/10">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metric pills */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {metricBadges.map((m) => (
            <span
              key={m}
              className="rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-4 py-1.5 text-xs text-primary-foreground/80"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- PROFIT CALCULATOR ---------- */
function ProfitCalculator() {
  const [ticketPrice, setTicketPrice] = useState(30);
  const [attendance, setAttendance] = useState(80);
  const [extraCards, setExtraCards] = useState(40);
  const [plantCost, setPlantCost] = useState(6);
  const [venueCost, setVenueCost] = useState(300);
  const [staffCost, setStaffCost] = useState(200);
  const [marketingCost, setMarketingCost] = useState(150);
  const [foodCost, setFoodCost] = useState(100);
  const [supplyCost, setSupplyCost] = useState(75);
  const [eventsPerMonth, setEventsPerMonth] = useState(4);

  const { gross, expenses, fees, netPerEvent, perGuest, monthly, annual } =
    useMemo(() => {
      const gross = ticketPrice * attendance + extraCards * 5;
      const plants = plantCost * attendance;
      const expenses =
        plants + venueCost + staffCost + marketingCost + foodCost + supplyCost;
      const fees = Math.round(gross * 0.035);
      const netPerEvent = gross - expenses - fees;
      const perGuest = attendance ? Math.round(netPerEvent / attendance) : 0;
      const monthly = netPerEvent * eventsPerMonth;
      const annual = monthly * 12;
      return { gross, expenses, fees, netPerEvent, perGuest, monthly, annual };
    }, [
      ticketPrice,
      attendance,
      extraCards,
      plantCost,
      venueCost,
      staffCost,
      marketingCost,
      foodCost,
      supplyCost,
      eventsPerMonth,
    ]);

  const money = (n: number) =>
    `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  const inputs: Array<{
    label: string;
    value: number;
    set: (n: number) => void;
    prefix?: string;
  }> = [
    { label: "Ticket price", value: ticketPrice, set: setTicketPrice, prefix: "$" },
    { label: "Expected attendance", value: attendance, set: setAttendance },
    { label: "Extra bingo cards sold", value: extraCards, set: setExtraCards },
    { label: "Average plant cost", value: plantCost, set: setPlantCost, prefix: "$" },
    { label: "Venue cost", value: venueCost, set: setVenueCost, prefix: "$" },
    { label: "Staff cost", value: staffCost, set: setStaffCost, prefix: "$" },
    { label: "Marketing cost", value: marketingCost, set: setMarketingCost, prefix: "$" },
    { label: "Food & beverage", value: foodCost, set: setFoodCost, prefix: "$" },
    { label: "Supplies", value: supplyCost, set: setSupplyCost, prefix: "$" },
    { label: "Events per month", value: eventsPerMonth, set: setEventsPerMonth },
  ];

  return (
    <section className="bg-[hsl(48_38%_94%)] border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="Profit calculator"
          title="See how much you could"
          accent="make per event"
          subtitle="Adjust the inputs to project your revenue, expenses, and profit."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <div className="rounded-3xl border border-border bg-card p-7 shadow-soft">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <Calculator className="h-4 w-4" /> Inputs
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {inputs.map((i) => (
                <div key={i.label}>
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    {i.label}
                  </Label>
                  <div className="relative mt-1.5">
                    {i.prefix && (
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {i.prefix}
                      </span>
                    )}
                    <Input
                      type="number"
                      value={i.value}
                      onChange={(e) => i.set(Number(e.target.value) || 0)}
                      className={`h-11 rounded-full bg-secondary/60 ${i.prefix ? "pl-7" : ""}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Projection */}
          <div className="rounded-3xl bg-primary p-7 text-primary-foreground shadow-lift">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
              <TrendingUp className="h-4 w-4" /> Projection
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Gross revenue", value: money(gross) },
                { label: "Total expenses", value: money(expenses) },
                { label: "Processing fees", value: money(fees) },
                { label: "Profit / guest", value: money(perGuest) },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-primary-foreground/[0.06] p-5"
                >
                  <div className="text-xs uppercase tracking-widest text-primary-foreground/60">
                    {s.label}
                  </div>
                  <div className="mt-2 font-display text-3xl">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-accent p-6 text-accent-foreground">
              <div className="text-xs font-semibold uppercase tracking-widest">
                Net profit / event
              </div>
              <div className="mt-1 font-display text-5xl">{money(netPerEvent)}</div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-primary-foreground/[0.06] p-5">
                <div className="text-xs uppercase tracking-widest text-primary-foreground/60">
                  Monthly
                </div>
                <div className="mt-2 font-display text-3xl">{money(monthly)}</div>
              </div>
              <div className="rounded-2xl bg-primary-foreground/[0.06] p-5">
                <div className="text-xs uppercase tracking-widest text-primary-foreground/60">
                  Annual
                </div>
                <div className="mt-2 font-display text-3xl">{money(annual)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- PRICING PLANS ---------- */
const starterFeatures = [
  "Fully branded website",
  "Unlimited events per month",
  "Ticketing + QR check-in",
  "Stripe payouts to your bank",
  "Email marketing tools",
  "Customer accounts & portal",
  "Analytics dashboard",
  "Playbook & training",
];

const unlimitedFeatures = [
  "Everything in Starter",
  "Multi-location management",
  "Team seats (up to 10)",
  "SMS marketing included",
  "Priority Slack support",
  "White-glove onboarding",
  "Regional exclusivity",
  "Custom domain",
];

function Plans() {
  return (
    <section className="bg-[hsl(48_38%_94%)] border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="Pricing"
          title="Two plans."
          accent="Pick your scale."
          subtitle="Start with everything you need. Upgrade when you grow."
        />
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
          {/* Starter */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              Plant Bingo · Starter
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-6xl">$97</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Everything you need to launch and run a single-market Plant Bingo
              business.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {starterFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" variant="outline" className="mt-7 w-full rounded-full">
              <Link to="/contact">Start Free Trial</Link>
            </Button>
          </div>

          {/* Unlimited */}
          <div className="relative rounded-3xl bg-primary p-8 text-primary-foreground shadow-lift">
            <div className="absolute -top-3 right-6 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              Most popular
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest text-accent">
              Plant Bingo · Unlimited
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-6xl">$197</span>
              <span className="text-primary-foreground/70">/mo</span>
            </div>
            <p className="mt-3 text-sm text-primary-foreground/80">
              For operators running multiple cities, regions, or a full team.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {unlimitedFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button asChild size="lg" variant="secondary" className="mt-7 w-full rounded-full">
              <Link to="/contact">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- TESTIMONIALS ---------- */
const testimonials = [
  {
    quote:
      "We sold out our first Plant Bingo night in 48 hours. Greenhouse Bingo made it feel like we had a full software team behind us.",
    name: "Marla Chen",
    title: "Owner, Fern & Fable Greenhouse",
    initial: "M",
  },
  {
    quote:
      "The analytics alone are worth $97/month. I know exactly which cities to expand into and what plants sell best.",
    name: "David Ortiz",
    title: "Founder, Sprout Society Events",
    initial: "D",
  },
  {
    quote:
      "We turned slow weeknights into our highest-revenue events. Our regulars come back for every new theme.",
    name: "Jenna Reeves",
    title: "Manager, Petal Palace Nursery",
    initial: "J",
  },
];

function Testimonials() {
  return (
    <section className="bg-[hsl(48_38%_94%)] border-t border-border/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeader
          eyebrow="Success stories"
          title="Greenhouse owners"
          accent="growing every week"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-3xl border border-border bg-card p-7 shadow-soft"
            >
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="mt-5 flex-1 text-sm leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary font-display text-lg text-primary-foreground">
                  {t.initial}
                </div>
                <div>
                  <div className="font-medium text-primary">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- FAQ ---------- */
const faqs = [
  {
    q: "Can I use my own branding?",
    a: "Yes. Every customer receives a fully branded website with their own logo, colors, typography, and content — editable without any code.",
  },
  {
    q: "Can I connect my own Stripe account?",
    a: "Yes. You connect your own Stripe account so payouts land in your bank directly. We never touch your funds.",
  },
  {
    q: "Do I receive payments directly?",
    a: "Yes. Ticket sales are paid out from Stripe to your bank on Stripe's standard payout schedule — usually 2 business days.",
  },
  {
    q: "Can I host unlimited events?",
    a: "Yes on every plan. There is no per-event cap and no per-ticket fee to the platform.",
  },
  {
    q: "Can I customize my website?",
    a: "Yes. Logo, colors, typography, hero copy, and event pages are all fully customizable from your dashboard.",
  },
  {
    q: "Do I need technical experience?",
    a: "No. If you can use email and a spreadsheet, you can run your business. Everything is point-and-click.",
  },
  {
    q: "Can I manage multiple locations?",
    a: "Yes on the Unlimited plan. Add cities, teams, and regions from one dashboard.",
  },
  {
    q: "Is there a contract?",
    a: "No. Month-to-month, cancel anytime from your dashboard.",
  },
  {
    q: "What support is included?",
    a: "Every plan includes email support and the knowledge base. Unlimited adds a priority Slack channel with our team.",
  },
];

function FAQ() {
  return (
    <section className="bg-[hsl(48_38%_94%)] border-t border-border/40">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <SectionHeader eyebrow="FAQ" title="Frequently asked" accent="questions" />
        <Accordion type="single" collapsible className="mt-12 space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={f.q}
              value={`item-${i}`}
              className="rounded-2xl border border-border bg-card px-6 shadow-soft"
            >
              <AccordionTrigger className="py-5 text-left font-display text-lg text-primary hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ---------- FINAL CTA ---------- */
function FinalCTA() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-accent">
          <Rocket className="h-3.5 w-3.5" /> Ready to launch
        </div>
        <h2 className="mt-6 font-display text-5xl font-semibold leading-tight md:text-6xl">
          Launch Your Own Plant Bingo Business Today
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-primary-foreground/80">
          Everything you need to build, market, manage, and grow a successful
          Plant Bingo business — starting at just $97/month.
        </p>
        <div className="mx-auto mt-8 inline-flex flex-wrap items-baseline justify-center gap-3 rounded-full bg-primary-foreground/[0.06] px-6 py-4">
          <span className="font-display text-4xl text-accent">$97/mo</span>
          <span className="text-primary-foreground/60">or</span>
          <span className="font-display text-4xl text-accent">$197/mo</span>
          <span className="text-sm text-primary-foreground/70">Unlimited</span>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/contact">
              Start Free Trial <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link to="/contact">Book a Live Demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

import {
  BrandedWebsite,
  EverythingCustomizable,
  OneDashboard,
  GetPaidInstantly,
} from "./StartBusinessExtras";

/* ---------- ROOT ---------- */
export function StartBusinessContent() {
  return (
    <>
      <Hero />
      <SkipBuilding />
      <BrandedWebsite />
      <VenuePartners />
      <EverythingCustomizable />
      <OneDashboard />
      <GetPaidInstantly />
      <GrowBusiness />
      <Resources />
      <AnalyticsDashboard />
      <ProfitCalculator />
      <Plans />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </>
  );
}
