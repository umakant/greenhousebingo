"use client";

import { Check } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CompareTable } from "@/components/pricing/CompareTable";
import { PriceCalculator } from "@/components/pricing/PriceCalculator";
import { LearnMoreLink } from "@/components/pricing/LearnMoreLink";

type Plan = {
  name: string;
  description: string;
  price: string;
  period: string;
  showStartsAt?: boolean;
  popular?: boolean;
  inheritsFrom?: string;
  features: string[];
};

const plans: Plan[] = [
  {
    name: "Monthly",
    description: "From a website to all the tools you need when starting.",
    price: "97.00",
    period: "/ month",
    features: [
      "5 Providers or 5 GB",
      "Advanced theme builder",
      "Your own domain",
      "Booking forms & customization",
      "Smart scheduling",
      "Mobile access",
      "Leads",
    ],
  },
  {
    name: "Annual",
    description:
      "For growing businesses who want more customization and automation.",
    price: "970.00",
    period: "/ year",
    popular: true,
    inheritsFrom: "Monthly",
    features: [
      "15 Providers or 15 GB",
      "Advanced reports",
      "Referral & rating system",
      "Gift cards",
      "GPS & clocking In/Out",
      "Prospects",
      "SMS notification",
    ],
  },
  {
    name: "Lifetime",
    description:
      "For advanced businesses and those who want all marketing features and automation capabilities.",
    price: "1,997.00",
    period: "/ Lifetime",
    showStartsAt: true,
    inheritsFrom: "Annual",
    features: [
      "50 Providers or 50 GB",
      "Campaigns (5,000 Contacts)",
      "Multi-Step forms",
      "Daily discounts",
      "Onboarding and Additional Options",
      "Multilingual",
      "Funnels and Additional Options",
    ],
  },
];

const sidebarLinks = [
  { href: "#plans", label: "Plans" },
  { href: "#larger-plans", label: "Larger Plans" },
  { href: "#compare", label: "Compare Plans" },
  { href: "#learn", label: "Learn More" },
  { href: "#faq", label: "FAQ" },
  { href: "#questions", label: "Questions" },
];

export function PricingContent() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="px-6 pt-16 pb-10 sm:pt-24 sm:pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Try A Plan 14-Days 100% Free!
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Start a 14-day free trial to test all the features that come with our plans.
            At any time during your trial, you can switch between plans.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
          <aside className="mb-8 lg:mb-0">
            <nav className="sticky top-28 rounded-3xl bg-[oklch(0.95_0.03_240)] p-6">
              <ul className="space-y-4">
                {sidebarLinks.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="flex items-center gap-2 text-base font-semibold text-brand transition-colors hover:text-foreground"
                    >
                      <span aria-hidden className="text-brand">↳</span>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="relative">
            <div className="mb-6 flex justify-end">
              <a
                href="#compare"
                className="inline-flex items-center rounded-full border-2 border-brand px-6 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-brand-foreground"
              >
                Why Upgrade to Premium?
              </a>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className="relative flex flex-col rounded-3xl border border-border bg-card p-8 shadow-sm"
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-5 py-1.5 text-xs font-bold text-white shadow-md">
                      Most Popular
                    </span>
                  )}
                  {plan.showStartsAt && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-600 px-5 py-1.5 text-xs font-bold text-white shadow-md">
                      Limited Seats
                    </span>
                  )}

                  <h2 className="text-3xl font-bold text-foreground">{plan.name}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground min-h-[60px]">
                    {plan.description}
                  </p>

                  <div className="mt-10">
                    {plan.showStartsAt && (
                      <p className="text-sm font-medium text-foreground">Starts at</p>
                    )}
                    <p className="flex items-baseline gap-1">
                      <span className="text-5xl font-bold tracking-tight text-foreground">
                        ${plan.price}
                      </span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </p>
                  </div>

                  {plan.inheritsFrom && (
                    <p className="mt-6 text-sm font-semibold text-emerald-600">
                      Everything in {plan.inheritsFrom} plus:
                    </p>
                  )}

                  <ul className="mt-5 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-foreground">
                          {f}
                          <LearnMoreLink label={f} />
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 space-y-3">
                    <a
                      href="#compare"
                      className="block text-center text-sm font-semibold text-brand underline underline-offset-4"
                    >
                      View all features
                    </a>
                    <button className="w-full rounded-full border-2 border-brand px-6 py-3 text-sm font-bold uppercase tracking-wide text-brand transition-colors hover:bg-brand hover:text-brand-foreground">
                      Try {plan.name} Free
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <PriceCalculator />
          </div>
        </div>
      </section>

      <CompareTable />

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-muted/30 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-10 space-y-4">
            {[
              { q: "Do I need a credit card to start the trial?", a: "No. Start your 14-day trial with just an email — we'll only ask for payment when you're ready to keep going." },
              { q: "Can I switch plans during the trial?", a: "Yes. You can upgrade, downgrade, or change plans any time during the trial to find what fits best." },
              { q: "What happens after my trial ends?", a: "Your account stays active and you'll be billed for the plan you've chosen. You can cancel anytime." },
              { q: "Are there any setup fees?", a: "No setup fees and no hidden charges. The price you see is the price you pay." },
            ].map((item) => (
              <details key={item.q} className="group rounded-2xl border border-border bg-card p-5 open:shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold text-foreground list-none">
                  {item.q}
                  <span className="text-brand transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
