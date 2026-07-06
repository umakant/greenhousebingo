import {
  LayoutDashboard,
  Inbox,
  Briefcase,
  CheckSquare,
  Megaphone,
  Calendar,
  FileText,
  Phone,
  Star,
  CreditCard,
  Users,
  Workflow,
  QrCode,
  Brain,
  Search,
  Globe,
  Contact,
  Sparkles,
  Ghost,
  GraduationCap,
  DollarSign,
  Palette,
  type LucideIcon,
} from "lucide-react";

type Feature = { label: string; icon: LucideIcon; active?: boolean };

const features: Feature[] = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Inbox", icon: Inbox },
  { label: "Deals", icon: Briefcase },
  { label: "Tasks", icon: CheckSquare },
  { label: "Campaigns", icon: Megaphone },
  { label: "Calendar", icon: Calendar },
  { label: "Forms", icon: FileText },
  { label: "Phone", icon: Phone },
  { label: "Reviews", icon: Star },
  { label: "Payments", icon: CreditCard },
  { label: "Affiliates", icon: Users },
  { label: "Workflows", icon: Workflow },
  { label: "QR Codes", icon: QrCode },
  { label: "AI Hub", icon: Brain },
  { label: "SEO", icon: Search },
  { label: "Sites", icon: Globe },
  { label: "Contacts", icon: Contact },
  { label: "AI Assistant", icon: Sparkles },
  { label: "Ghost Intent", icon: Ghost },
  { label: "Learning", icon: GraduationCap },
  { label: "SaaS", icon: DollarSign },
  { label: "Branding", icon: Palette },
];

export function FeatureGridSection() {
  return (
    <section className="bg-background px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex justify-center">
          <span className="rounded-full bg-brand/10 px-5 py-1.5 text-sm font-semibold text-brand">
            See It In Action
          </span>
        </div>

        <h2 className="text-center text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Everything You Need to{" "}
          <span className="text-brand">Scale Your Business</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base text-muted-foreground sm:text-lg">
          A clean, powerful interface that helps you manage contacts, close deals, and
          automate your workflow.
        </p>

        {/* Feature pills */}
        <div className="mx-auto mt-12 flex max-w-5xl flex-wrap justify-center gap-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <button
                key={f.label}
                className={[
                  "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all",
                  f.active
                    ? "border-brand bg-brand text-brand-foreground shadow-md"
                    : "border-border bg-card text-foreground hover:border-brand hover:text-brand",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Browser mockup */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="h-3 w-3 rounded-full bg-green-400" />
            <div className="ml-4 flex-1 rounded-md bg-card px-3 py-1 text-center text-xs text-muted-foreground">
              app.paperflight.com
            </div>
          </div>

          {/* App body */}
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] min-h-[480px]">
            {/* Sidebar — hidden on mobile to keep the mockup readable */}
            <aside className="hidden md:block border-r border-border bg-muted/30 p-4">
              <div className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                View Mode
              </div>
              <div className="rounded-md bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm">
                Business View
              </div>
              <div className="mt-6 space-y-1 text-sm">
                {["Launchpad", "Dashboard", "Conversations", "Calendar", "Contacts", "Opportunities"].map((item, i) => (
                  <div
                    key={item}
                    className={[
                      "rounded-md px-3 py-2",
                      i === 1
                        ? "bg-brand/15 font-semibold text-brand"
                        : "text-muted-foreground hover:bg-muted",
                    ].join(" ")}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </aside>

            {/* Main */}
            <div className="p-4 sm:p-6">
              <div className="mb-2 text-xs text-muted-foreground">Home › Dashboard</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground sm:text-2xl">Dashboard</h3>
                  <p className="text-sm text-muted-foreground">
                    Your complete business intelligence center
                  </p>
                </div>
                <div className="hidden gap-2 sm:flex">
                  <span className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground">Last 30 days</span>
                  <span className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground">Refresh</span>
                  <span className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground">Export</span>
                </div>
              </div>

              {/* KPI cards */}
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Total Contacts", value: "150", delta: "+269.13%" },
                  { label: "Active Deals", value: "30", delta: "+269.1%" },
                  { label: "Revenue", value: "$1076K", delta: "+533.33%" },
                  { label: "Total Deals", value: "57", delta: "+533.3%" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
                    <p className="mt-1 text-xs font-semibold text-brand">
                      ↑ {s.delta} vs last period
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { title: "Analytics & Reports", desc: "View detailed performance reports" },
                  { title: "Workflows", desc: "Automate your business processes" },
                ].map((c) => (
                  <div key={c.title} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground">{c.title}</p>
                      <span className="text-xs font-semibold text-brand">View →</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-bold text-foreground">Revenue Trend</p>
                  <p className="text-xs text-muted-foreground">Monthly revenue from closed deals</p>
                  <div className="mt-4 flex h-28 items-end gap-2">
                    {[40, 60, 35, 75, 55, 90, 70, 95, 80, 100, 85, 110].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-brand/70" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-bold text-foreground">Conversion Metrics</p>
                  <p className="text-xs text-muted-foreground">Key performance indicators</p>
                  <div className="mt-4 space-y-3">
                    {[
                      { label: "Lead → Contact", val: 78 },
                      { label: "Contact → Deal", val: 54 },
                      { label: "Deal → Closed", val: 41 },
                      { label: "Trial → Paid", val: 67 },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{m.label}</span>
                          <span className="font-semibold text-foreground">{m.val}%</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${m.val}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pipeline */}
              <div className="mt-4 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">Sales Pipeline</p>
                  <span className="text-xs text-muted-foreground">57 deals · $1,076,000</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    { stage: "New", count: 18, amt: "$120K" },
                    { stage: "Qualified", count: 14, amt: "$245K" },
                    { stage: "Proposal", count: 11, amt: "$310K" },
                    { stage: "Negotiation", count: 8, amt: "$255K" },
                    { stage: "Closed Won", count: 6, amt: "$146K" },
                  ].map((p) => (
                    <div key={p.stage} className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{p.stage}</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{p.count}</p>
                      <p className="text-[11px] text-brand">{p.amt}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent activity */}
              <div className="mt-4 rounded-xl border border-border p-4">
                <p className="text-sm font-bold text-foreground">Recent Activity</p>
                <div className="mt-3 divide-y divide-border">
                  {[
                    { who: "Sarah Chen", what: "closed deal with Acme Corp", when: "2m ago", amt: "$12,500" },
                    { who: "Marcus Lee", what: "added 3 new contacts", when: "18m ago", amt: "" },
                    { who: "Priya Patel", what: "sent proposal to Globex", when: "1h ago", amt: "$8,200" },
                    { who: "Diego Alvarez", what: "scheduled follow-up call", when: "3h ago", amt: "" },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
                          {a.who.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <p className="text-xs text-foreground">
                          <span className="font-semibold">{a.who}</span>{" "}
                          <span className="text-muted-foreground">{a.what}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        {a.amt && <span className="font-semibold text-brand">{a.amt}</span>}
                        <span className="text-muted-foreground">{a.when}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Caption below screenshot */}
        <p className="mx-auto mt-10 max-w-2xl text-center text-base text-muted-foreground sm:text-lg">
          A complete command center for your service business — track revenue, manage
          your pipeline, and automate workflows from one beautifully designed dashboard.
        </p>
      </div>
    </section>
  );
}
