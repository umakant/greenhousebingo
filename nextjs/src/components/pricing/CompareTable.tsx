import { Check, X } from "lucide-react";
import { LearnMoreLink } from "./LearnMoreLink";

type Cell = boolean | string;
type Row = { label: string; values: [Cell, Cell, Cell] };

// Rows pulled from BookingKoala's compare table
const rows: Row[] = [
  { label: "Providers/Storage", values: ["5 Providers or 5 GB", "15 Providers or 15 GB", "50 Providers or 50 GB"] },
  { label: "Leads", values: ["1 Custom Form", "1 Custom Form", "Unlimited Forms and Additional Options"] },
  { label: "Campaigns", values: [false, false, "5,000 Contacts"] },
  { label: "Hiring", values: [false, "Unlimited Prospects", "Onboarding and Additional Options"] },
  { label: "Advanced Theme Builder", values: [true, true, "Includes Additional Options"] },
  { label: "Blog", values: [true, true, true] },
  { label: "SEO", values: [true, true, true] },
  { label: "Connect With Your Existing Site", values: [true, true, true] },
  { label: "Your Own Domain", values: [true, true, true] },
  { label: "SSL Protection", values: [true, true, true] },
  { label: "Booking Forms & Customization", values: ["One-Step and Two-Step", "One-Step and Two-Step", "Plus Multi-Step Forms"] },
  { label: "Import Tool", values: [true, true, true] },
  { label: "Export Bookings", values: [false, true, true] },
  { label: "Mobile Access", values: [true, true, true] },
  { label: "Customer Dashboard", values: [true, true, true] },
  { label: "Provider/Team Dashboard", values: [true, true, true] },
  { label: "Admin/Office Staff Dashboard", values: [true, true, true] },
  { label: "Smart Scheduling", values: [true, true, true] },
  { label: "Calendar", values: ["Vertical and List Views", "Plus Horizontal and Map Views", "All"] },
  { label: "Unassigned Bookings & Drafts", values: [true, true, true] },
  { label: "Individuals, Teams & Pairs", values: [true, true, true] },
  { label: "Charges, Payments & Tips", values: [true, true, "Includes Additional Options"] },
  { label: "Invoicing", values: [true, true, "Includes Additional Options"] },
  { label: "Cancellation Fees", values: [false, true, true] },
  { label: "Checklists", values: [true, true, "Includes Additional Options"] },
  { label: "Tags", values: [true, true, true] },
  { label: "Third Party Integrations", values: [true, true, true] },
  { label: "Live Chat", values: [false, true, true] },
  { label: "Coupons", values: [true, true, "Includes Additional Options"] },
  { label: "Daily Discounts", values: [false, false, true] },
  { label: "Cart Abandonment & Email Lists", values: ["Basic Via Third Party", "Basic Via Third Party", "Leads Module + Advanced Options"] },
  { label: "Email Notifications", values: [true, true, true] },
  { label: "Send Schedule Automatically", values: [true, true, true] },
  { label: "Email Tracking", values: [true, true, true] },
  { label: "SMS Notifications", values: [false, true, true] },
  { label: "System Alerts", values: [true, true, true] },
  { label: "Mobile Apps & App Notifications", values: [true, true, true] },
  { label: "GPS & Clocking In/Out", values: [false, true, true] },
  { label: "Remove Branding", values: [false, false, true] },
  { label: "Advanced Reports", values: [false, true, true] },
  { label: "Advanced Cancellations", values: [false, true, true] },
  { label: "Referral & Rating System", values: [false, true, true] },
  { label: "Automatic Reviews", values: [false, true, true] },
  { label: "Gift Cards", values: [false, true, true] },
  { label: "Multilingual", values: [false, false, true] },
  { label: "Funnels and Additional Options", values: [false, false, true] },
];

function CellView({ value }: { value: Cell }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-emerald-500" />;
  if (value === false) return <X className="mx-auto h-5 w-5 text-muted-foreground/40" />;
  return <span className="text-sm text-foreground">{value}</span>;
}

const planMeta: { name: string; price: string; period: string; popular?: boolean }[] = [
  { name: "Monthly", price: "97.00", period: "/ month" },
  { name: "Annual", price: "970.00", period: "/ year", popular: true },
  { name: "Lifetime", price: "1,997.00", period: "/ Lifetime" },
];

export function CompareTable() {
  return (
    <section id="compare" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24">
      <div className="rounded-3xl border border-border bg-card">
        <div className="min-w-[720px]">
        {/* Sticky header — sticks to page scroll, rows pass behind with blur */}
        <div className="sticky top-16 z-20 rounded-t-3xl border-b border-border bg-card/80 shadow-sm backdrop-blur-md">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-end gap-4 px-6 py-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Monthly price</h2>
            </div>
            {planMeta.map((p) => (
              <div key={p.name} className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-bold text-foreground sm:text-xl">{p.name}</span>
                  {p.popular && (
                    <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Most Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 flex flex-nowrap items-baseline justify-center gap-x-1">
                  <span className="text-lg font-bold text-foreground tabular-nums sm:text-xl">${p.price}</span>
                  <span className="text-xs text-muted-foreground">{p.period}</span>
                </p>
                <button className="mt-3 w-full rounded-full border-2 border-brand px-4 py-2 text-xs font-bold uppercase tracking-wide text-brand transition-colors hover:bg-brand hover:text-brand-foreground">
                  Try This Free
                </button>
              </div>
            ))}
          </div>
          <div className="px-6 pb-4 text-right">
            <a href="#" className="text-sm font-semibold text-brand underline underline-offset-2">
              Why Upgrade to Premium?
            </a>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {rows.map((row, idx) => (
            <div
              key={row.label}
              className={`grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center gap-4 px-6 py-4 ${
                idx % 2 === 0 ? "bg-background" : "bg-muted/20"
              }`}
            >
              <div className="text-sm font-medium text-foreground">
                {row.label}
                <LearnMoreLink label={row.label} />
              </div>
              {row.values.map((v, i) => (
                <div key={i} className="text-center">
                  <CellView value={v} />
                </div>
              ))}
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
