"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicMarketingBottomCta } from "@/components/landing/public-marketing-bottom-cta";
import type { PublicComparePageContent } from "@/lib/public-compare-pages-data";

export function PublicComparePage({
  content,
  enableRegistration = true,
}: {
  content: PublicComparePageContent;
  enableRegistration?: boolean;
}) {
  return (
    <div className="bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {content.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {content.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            {content.subtitle}
          </p>
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-sm leading-relaxed text-muted-foreground md:text-base">
          {content.intro}
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border-2 border-brand bg-card p-6 shadow-sm ring-2 ring-brand/15">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Paper Flight</p>
            <h2 className="mt-2 text-lg font-bold text-foreground">Why teams choose us</h2>
            <ul className="mt-4 space-y-3">
              {content.whySwitch.map((line) => (
                <li key={line} className="flex gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15">
                    <Check className="h-3 w-3 text-brand" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full sm:w-auto" size="sm">
              <Link href="/pricing">
                See pricing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {content.competitorName}
            </p>
            <h2 className="mt-2 text-lg font-bold text-foreground">What they&apos;re known for</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {content.rows[0]?.competitor
                ? `Strong in areas like ${content.rows
                    .slice(0, 2)
                    .map((r) => r.category.toLowerCase())
                    .join(" and ")}. Many teams pair or replace tools like ${content.competitorName} as they need deeper operations, HR, or training in one platform.`
                : `Compare capabilities side by side below.`}
            </p>
            <Button asChild variant="outline" className="mt-6 w-full sm:w-auto" size="sm">
              <Link href="/features">Explore Paper Flight features</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-5 py-4 font-semibold text-foreground">Category</th>
                <th className="px-5 py-4 font-semibold text-brand">Paper Flight</th>
                <th className="px-5 py-4 font-semibold text-muted-foreground">{content.competitorName}</th>
              </tr>
            </thead>
            <tbody>
              {content.rows.map((row) => (
                <tr key={row.category} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 font-medium text-foreground">{row.category}</td>
                  <td className="px-5 py-4 text-muted-foreground">{row.paperFlight}</td>
                  <td className="px-5 py-4 text-muted-foreground">{row.competitor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PublicMarketingBottomCta enableRegistration={enableRegistration} />
      </div>
    </div>
  );
}
