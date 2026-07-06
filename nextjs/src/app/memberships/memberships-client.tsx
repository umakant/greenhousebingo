"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { SiteHeader } from "@/components/waterice/site-header";

type PlanKey = "insider" | "vip";
type TabKey = PlanKey | "compare";

const plans: Record<PlanKey, {
  name: string;
  price: string;
  tagline: string;
  perks: string[];
}> = {
  insider: {
    name: "Frozen Fortune Insider",
    price: "$19.99/month",
    tagline:
      "Perfect for entrepreneurs getting started and learning the foundations of the water ice business.",
    perks: [
      "Monthly business tips & training",
      "Community access",
      "Beginner startup resources",
      "Limited Canva templates",
      "Basic vendor guidance",
      "Monthly live Q&A sessions",
    ],
  },
  vip: {
    name: "VIP Frozen Fortune Society",
    price: "$29.99/month",
    tagline:
      "Advanced mentorship, business growth systems, and priority opportunities for serious entrepreneurs looking to scale.",
    perks: [
      "Everything in Insider",
      "Advanced business trainings",
      "Live coaching sessions",
      "Pricing & profit systems",
      "Full marketing template access",
      "Wholesale & vendor discounts",
      "Priority vending opportunities",
      "VIP entrepreneur community access",
    ],
  },
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "insider", label: "Insider" },
  { key: "vip", label: "VIP" },
  { key: "compare", label: "Compare" },
];

function PlanCard({ planKey, plan }: { planKey: PlanKey; plan: typeof plans[PlanKey] }) {
  return (
    <article className="rounded-3xl border border-border bg-card p-8 md:p-10 shadow-sm flex flex-col">
      <h2 className="font-display text-2xl md:text-3xl font-extrabold text-foreground">
        {plan.name}
      </h2>
      <p className="mt-2 text-primary font-bold text-2xl">{plan.price}</p>
      <p className="mt-4 text-muted-foreground">{plan.tagline}</p>

      <div className="mt-8 flex-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
          Includes:
        </h3>
        <ul className="space-y-3">
          {plan.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-3 text-foreground">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={`/memberships/join/${planKey}`}
        className="mt-8 w-full rounded-full bg-primary text-primary-foreground font-semibold py-3 text-center hover:opacity-95 transition"
      >
        Join {plan.name}
      </Link>
    </article>
  );
}

export function MembershipsClient() {
  const [active, setActive] = useState<TabKey>("insider");

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="memberships" />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-accent/10 to-background border-b">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(var(--primary)/0.35) 0, transparent 40%), radial-gradient(circle at 80% 70%, hsl(var(--accent)/0.35) 0, transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-20 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary mb-3">
            Join the Crew
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-black tracking-tight">
            <span className="text-primary">Memberships</span> built for cravings.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Cool perks, exclusive flavors, and priority delivery — all summer long.
            Pick the plan that fits your scoop.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-full bg-card border border-border p-1.5 shadow-sm">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActive(key)}
                  className={`rounded-full px-6 py-2.5 text-sm font-bold uppercase tracking-wider transition ${
                    active === key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main
        className={`mx-auto px-6 py-16 ${
          active === "compare" ? "max-w-5xl" : "max-w-2xl"
        }`}
      >
        {active === "compare" ? (
          <ComparisonTable />
        ) : (
          <PlanCard planKey={active} plan={plans[active]} />
        )}
      </main>
    </div>
  );
}

const comparisonRows: { feature: string; insider: boolean | string; vip: boolean | string }[] = [
  { feature: "Monthly business tips & training", insider: true, vip: true },
  { feature: "Community access", insider: "Standard", vip: "VIP entrepreneur community" },
  { feature: "Beginner startup resources", insider: true, vip: true },
  { feature: "Canva / marketing templates", insider: "Limited", vip: "Full access" },
  { feature: "Vendor guidance", insider: "Basic", vip: "Wholesale & vendor discounts" },
  { feature: "Live Q&A sessions", insider: "Monthly", vip: "Monthly" },
  { feature: "Advanced business trainings", insider: false, vip: true },
  { feature: "Live coaching sessions", insider: false, vip: true },
  { feature: "Pricing & profit systems", insider: false, vip: true },
  { feature: "Priority vending opportunities", insider: false, vip: true },
];

function Cell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-5 w-5 text-primary mx-auto" />
    ) : (
      <span className="text-muted-foreground/50">—</span>
    );
  }
  return <span className="text-foreground">{value}</span>;
}

function ComparisonTable() {
  return (
    <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="grid grid-cols-3 border-b border-border bg-muted/30">
        <div className="p-5 font-bold uppercase tracking-wider text-xs text-muted-foreground">
          Feature
        </div>
        <div className="p-5 text-center">
          <p className="font-display text-lg font-extrabold text-foreground">Insider</p>
          <p className="text-primary font-bold">$19.99/mo</p>
        </div>
        <div className="p-5 text-center bg-primary/5">
          <p className="font-display text-lg font-extrabold text-foreground">VIP</p>
          <p className="text-primary font-bold">$29.99/mo</p>
        </div>
      </div>

      {comparisonRows.map((row, i) => (
        <div
          key={row.feature}
          className={`grid grid-cols-3 items-center ${
            i !== comparisonRows.length - 1 ? "border-b border-border" : ""
          }`}
        >
          <div className="p-4 text-sm font-medium text-foreground">{row.feature}</div>
          <div className="p-4 text-center text-sm">
            <Cell value={row.insider} />
          </div>
          <div className="p-4 text-center text-sm bg-primary/5">
            <Cell value={row.vip} />
          </div>
        </div>
      ))}

      <div className="grid grid-cols-3 gap-4 p-6 border-t border-border bg-muted/20">
        <div />
        <Link
          href="/memberships/join/insider"
          className="rounded-full bg-card border border-border text-foreground font-semibold py-2.5 text-center hover:bg-muted transition"
        >
          Join Insider
        </Link>
        <Link
          href="/memberships/join/vip"
          className="rounded-full bg-primary text-primary-foreground font-semibold py-2.5 text-center hover:opacity-95 transition"
        >
          Join VIP
        </Link>
      </div>
    </div>
  );
}
