"use client";

import Link from "next/link";
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  Camera,
  ClipboardCheck,
  CreditCard,
  FileText,
  Globe,
  Headphones,
  LayoutGrid,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  Plug,
  Send,
  Star,
  Users,
  Webhook,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PublicMarketingBottomCta } from "@/components/landing/public-marketing-bottom-cta";
import type { ProductIconKey, PublicProductPageContent } from "@/lib/public-product-pages-data";
import type { PublicPricingAddOn } from "@/lib/public-pricing-data";
import { cn } from "@/lib/utils";

const PRODUCT_FEATURE_ICONS: Record<ProductIconKey, LucideIcon> = {
  "file-text": FileText,
  send: Send,
  camera: Camera,
  calendar: Calendar,
  "clipboard-check": ClipboardCheck,
  "map-pin": MapPin,
  "bar-chart-3": BarChart3,
  users: Users,
  headphones: Headphones,
  "message-square": MessageSquare,
  "layout-grid": LayoutGrid,
  "calendar-check": CalendarCheck,
  star: Star,
  mail: Mail,
  megaphone: Megaphone,
  globe: Globe,
};

const INTEGRATION_ICONS: Record<string, LucideIcon> = {
  Payments: CreditCard,
  Messaging: MessageSquare,
  Calendar: Calendar,
  Email: Mail,
  Inbox: MessageSquare,
  Meetings: Calendar,
  Developer: Webhook,
  Commerce: Plug,
};

function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{subtitle}</p>
    </div>
  );
}

function GroupedSections({ sections }: { sections: NonNullable<PublicProductPageContent["groupedSections"]> }) {
  return (
    <div className="mt-12 space-y-14">
      {sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-center text-xl font-bold text-foreground sm:text-2xl">{section.heading}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => {
              const Icon = item.iconKey ? PRODUCT_FEATURE_ICONS[item.iconKey] : null;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  {Icon ? (
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                  ) : null}
                  <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function CardGrid({
  cards,
  addOns,
}: {
  cards: NonNullable<PublicProductPageContent["cards"]>;
  addOns?: PublicPricingAddOn[];
}) {
  return (
    <div className="mt-12 space-y-10">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((item) => {
          const Icon = item.badge ? INTEGRATION_ICONS[item.badge] ?? Plug : Plug;
          return (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" />
                </span>
                {item.badge ? (
                  <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                    {item.badge}
                  </Badge>
                ) : null}
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          );
        })}
      </div>

      {addOns && addOns.length > 0 ? (
        <section>
          <h2 className="text-center text-xl font-bold text-foreground sm:text-2xl">Subscription modules</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
            Enable add-ons on your plan to unlock additional capabilities inside Paper Flight.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {addOns.map((addon) => (
              <li
                key={addon.module}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm"
              >
                <span className="font-medium text-foreground">{addon.alias}</span>
                <span className="text-muted-foreground">{addon.module}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/pricing" className="font-semibold text-brand hover:underline">
              Compare plans →
            </Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}

function ChangelogTimeline({ entries }: { entries: NonNullable<PublicProductPageContent["changelog"]> }) {
  return (
    <div className="mx-auto mt-12 max-w-3xl">
      <ol className="relative border-l border-border pl-8">
        {entries.map((entry, index) => (
          <li key={entry.version} className={cn("pb-10", index === entries.length - 1 && "pb-0")}>
            <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-background bg-brand" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-foreground">v{entry.version}</span>
              <span className="text-sm text-muted-foreground">{entry.date}</span>
              {entry.tag ? (
                <Badge className="bg-brand text-brand-foreground hover:bg-brand/90">{entry.tag}</Badge>
              ) : null}
            </div>
            <ul className="mt-4 space-y-2">
              {entry.highlights.map((line) => (
                <li key={line} className="text-sm leading-relaxed text-muted-foreground">
                  {line}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RoadmapBoard({ columns }: { columns: NonNullable<PublicProductPageContent["roadmap"]> }) {
  return (
    <div className="mt-12 grid gap-6 lg:grid-cols-3">
      {columns.map((col) => (
        <div key={col.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand">{col.title}</p>
          <h2 className="mt-2 text-lg font-bold text-foreground">{col.subtitle}</h2>
          <ul className="mt-6 space-y-5">
            {col.items.map((item) => (
              <li key={item.title} className="border-t border-border pt-5 first:border-0 first:pt-0">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function PublicProductPage({
  content,
  addOns,
  enableRegistration = true,
}: {
  content: PublicProductPageContent;
  addOns?: PublicPricingAddOn[];
  enableRegistration?: boolean;
}) {
  return (
    <div className="bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <PageHero eyebrow={content.eyebrow} title={content.title} subtitle={content.subtitle} />

        {content.variant === "grouped" && content.groupedSections ? (
          <GroupedSections sections={content.groupedSections} />
        ) : null}

        {content.variant === "cards" && content.cards ? (
          <CardGrid cards={content.cards} addOns={addOns} />
        ) : null}

        {content.variant === "timeline" && content.changelog ? (
          <ChangelogTimeline entries={content.changelog} />
        ) : null}

        {content.variant === "roadmap" && content.roadmap ? (
          <RoadmapBoard columns={content.roadmap} />
        ) : null}

        <PublicMarketingBottomCta enableRegistration={enableRegistration} />
      </div>
    </div>
  );
}
