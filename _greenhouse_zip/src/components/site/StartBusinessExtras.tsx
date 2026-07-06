import {
  Sparkles,
  Check,
  Palette,
  Paintbrush,
  Ticket,
  Megaphone,
  Link2,
  FileText,
  Calendar,
  QrCode,
  Users,
  Sprout,
  UserCog,
  Building2,
  Handshake,
  Tag,
  Mail,
  MessageSquare,
  BarChart3,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  LineChart,
  Receipt,
} from "lucide-react";

/* ---------- Shared header ---------- */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}

/* ---------- 1. BRANDED WEBSITE ---------- */
const brandItems = [
  "Business Name",
  "Logo",
  "Brand Colors",
  "Homepage",
  "Hero Images",
  "About Page",
  "Contact Info",
  "FAQs",
  "Sponsors",
  "Social Media",
  "Event Locations",
  "Pricing",
  "Terms & Privacy",
  "Email Templates",
];

const mockSites = [
  { name: "Fern & Fable", header: "bg-[#0d3d1f]", dot: "bg-[#7ed957]" },
  { name: "Petal Palace", header: "bg-[#f06ab0]", dot: "bg-[#f5c518]" },
  { name: "Sprout Society", header: "bg-[#7cc4e8]", dot: "bg-[#fbe9d0]" },
  { name: "Verde Bingo Co.", header: "bg-[#ff6b5b]", dot: "bg-[#fbe9d0]" },
];

export function BrandedWebsite() {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2 lg:items-center">
        {/* mock sites */}
        <div className="grid grid-cols-2 gap-5">
          {mockSites.map((s, i) => (
            <div
              key={s.name}
              className={`rounded-2xl border border-border/60 bg-card p-4 shadow-sm ${
                i === 1 || i === 2 ? "translate-y-6" : ""
              }`}
            >
              <div
                className={`relative flex h-28 items-center justify-center rounded-xl ${s.header}`}
              >
                <span className={`h-8 w-8 rounded-full ${s.dot}`} />
              </div>
              <div className="mt-4 text-lg font-serif font-semibold text-foreground">
                {s.name}
              </div>
              <div className="mt-3 h-1.5 w-3/4 rounded-full bg-muted" />
              <div className="mt-2 h-3 w-full rounded-full bg-primary/15" />
            </div>
          ))}
        </div>

        {/* copy + list */}
        <div>
          <Eyebrow>Your business. Your brand.</Eyebrow>
          <h2 className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight text-primary sm:text-5xl">
            Every customer gets a{" "}
            <span className="text-[hsl(var(--primary)/0.7)]">
              completely branded website
            </span>
          </h2>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Launch under your own name with a site that looks like it was
            custom-built for your greenhouse — no code, no designers, no
            delays.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {brandItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-full bg-primary/5 px-3 py-2 text-sm text-foreground"
              >
                <Check className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm font-medium text-primary">
            ✨ Everything editable without coding.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------- 2. EVERYTHING CUSTOMIZABLE (6 categories) ---------- */
const categories = [
  {
    icon: Palette,
    title: "Design",
    tags: ["Website Design", "Homepage", "Navigation", "Footer", "Hero Images"],
  },
  {
    icon: Paintbrush,
    title: "Brand",
    tags: ["Brand Colors", "Typography", "Logo", "Photo Galleries"],
  },
  {
    icon: Ticket,
    title: "Ticketing",
    tags: ["QR Tickets", "Ticket Pricing", "Event Categories", "Coupons"],
  },
  {
    icon: Megaphone,
    title: "Marketing",
    tags: ["Email Templates", "Blog", "FAQs", "SEO Settings"],
  },
  {
    icon: Link2,
    title: "Connect",
    tags: ["Social Links", "Sponsors", "Maps", "Contact Info"],
  },
  {
    icon: FileText,
    title: "Business",
    tags: ["Policies", "Forms", "Analytics", "Domain"],
  },
];

export function EverythingCustomizable() {
  return (
    <section className="bg-secondary/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Everything is customizable</Eyebrow>
          <h2 className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight text-primary sm:text-5xl">
            Design, edit, and launch —{" "}
            <span className="text-[hsl(var(--primary)/0.7)]">no code needed</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Change any part of your site or business from one easy admin
            dashboard.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ icon: Icon, title, tags }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/60 bg-card p-7 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <h3 className="font-serif text-2xl font-semibold text-primary">
                  {title}
                </h3>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. ONE DASHBOARD + 12 FEATURE CARDS ---------- */
const dashNav = [
  "Dashboard",
  "Events",
  "Tickets",
  "Customers",
  "Plants",
  "Marketing",
  "Reports",
];

const dashboardStats = [
  { label: "Revenue", value: "$32,900", delta: "+18%" },
  { label: "Tickets", value: "1,204", delta: "+9%" },
  { label: "Events", value: "14", delta: "+3" },
];

const bars = [
  [60, 90, 95, 55, 80, 100, 70, 88, 92, 85, 78, 96],
  [45, 40, 70, 55, 65, 42, 78, 72, 60, 85, 50, 82],
];

const dashFeatures = [
  { icon: Calendar, title: "Event Management", desc: "Create unlimited Plant Bingo events." },
  { icon: Ticket, title: "Ticket Sales", desc: "Sell tickets online 24/7." },
  { icon: QrCode, title: "QR Code Check-In", desc: "Fast registration using QR codes." },
  { icon: Users, title: "Customer Management", desc: "Manage customers and registrations." },
  { icon: Sprout, title: "Plant Inventory", desc: "Track every plant before and after events.", featured: true },
  { icon: UserCog, title: "Staff Management", desc: "Assign staff to events." },
  { icon: Building2, title: "Venue Management", desc: "Manage multiple locations." },
  { icon: Handshake, title: "Sponsors", desc: "Display and manage local sponsors." },
  { icon: Tag, title: "Coupons", desc: "Create discounts and promotions." },
  { icon: Mail, title: "Email Marketing", desc: "Reminders and promotions built-in." },
  { icon: MessageSquare, title: "SMS Notifications", desc: "Notify attendees instantly." },
  { icon: BarChart3, title: "Reporting", desc: "Financial and attendance reports." },
];

export function OneDashboard() {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Business Platform</Eyebrow>
          <h2 className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight text-primary sm:text-5xl">
            One dashboard to run{" "}
            <span className="text-[hsl(var(--primary)/0.7)]">your entire business</span>
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Purpose-built for Plant Bingo operators. Everything from ticket
            sales to plant inventory in a single beautiful interface.
          </p>
        </div>

        {/* dashboard mock */}
        <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/50 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <div className="ml-6 flex-1 rounded-md bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              yourbingo.com/admin
            </div>
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-[180px_1fr]">
            <nav className="flex flex-col gap-1">
              {dashNav.map((n, i) => (
                <div
                  key={n}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    i === 0
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {n}
                </div>
              ))}
            </nav>
            <div>
              <div className="grid gap-4 sm:grid-cols-3">
                {dashboardStats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-border/60 bg-secondary/40 p-4"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </div>
                    <div className="mt-2 font-serif text-2xl font-bold text-primary">
                      {s.value}
                    </div>
                    <div className="text-xs text-primary/70">{s.delta}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {bars.map((row, r) => (
                  <div key={r} className="grid grid-cols-12 items-end gap-2 h-20">
                    {row.map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="rounded-md bg-gradient-to-t from-primary/60 to-[hsl(var(--primary)/0.9)]"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* feature cards */}
        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {dashFeatures.map(({ icon: Icon, title, desc, featured }) => (
            <div
              key={title}
              className={`rounded-2xl border p-7 shadow-sm transition hover:shadow-md ${
                featured
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/60 bg-card"
              }`}
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-full ${
                  featured ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-serif text-xl font-semibold text-primary">
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 4. GET PAID INSTANTLY ---------- */
const paymentFeatures = [
  { icon: CreditCard, title: "Instant Payments", desc: "Ticket revenue lands in your bank quickly." },
  { icon: ShieldCheck, title: "Secure Checkout", desc: "Best-in-class fraud protection." },
  { icon: ShieldCheck, title: "PCI Compliant", desc: "Stripe handles all card data securely." },
  { icon: RefreshCw, title: "Refund Management", desc: "One-click refunds and disputes." },
  { icon: LineChart, title: "Financial Reporting", desc: "Real-time revenue dashboards." },
  { icon: Receipt, title: "Tax Reporting", desc: "1099-K & year-end exports." },
];

export function GetPaidInstantly() {
  return (
    <section className="relative overflow-hidden bg-[#0d3d1f] py-24 text-primary-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(60% 40% at 80% 20%, hsl(var(--primary)/0.5), transparent 60%), radial-gradient(50% 40% at 10% 80%, hsl(var(--primary)/0.4), transparent 60%)",
        }}
      />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:items-start">
        {/* left */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#a7e28c]">
            <CreditCard className="h-3.5 w-3.5" />
            Payments
          </div>
          <h2 className="mt-6 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            Get Paid Instantly
          </h2>
          <p className="mt-5 max-w-lg text-lg text-white/75">
            Connect your own Stripe account in one click. Every ticket sold is
            deposited directly into your bank — never through us.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[#a7e28c] font-bold text-[#0d3d1f]">
                  S
                </span>
                <div>
                  <div className="font-semibold">Stripe Account</div>
                  <div className="text-xs text-white/60">
                    Connected · Payouts enabled
                  </div>
                </div>
              </div>
              <span className="rounded-full border border-[#a7e28c]/40 bg-[#a7e28c]/10 px-3 py-1 text-xs font-medium text-[#a7e28c]">
                Active
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { l: "Today", v: "$1,240" },
                { l: "This Week", v: "$8,410" },
                { l: "This Month", v: "$32,900" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    {s.l}
                  </div>
                  <div className="mt-1 font-serif text-xl font-bold">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right feature grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {paymentFeatures.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:bg-white/10"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#a7e28c]/15">
                <Icon className="h-5 w-5 text-[#a7e28c]" />
              </span>
              <h3 className="mt-4 font-serif text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-white/70">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
