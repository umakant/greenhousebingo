"use client";

import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicMarketingBottomCta } from "@/components/landing/public-marketing-bottom-cta";
import type { PublicInfoPageContent } from "@/lib/public-info-pages-data";

function PageHero({
  eyebrow,
  title,
  subtitle,
  lastUpdated,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  lastUpdated?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{subtitle}</p>
      {lastUpdated ? (
        <p className="mt-3 text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
      ) : null}
    </div>
  );
}

function DocumentBody({ sections }: { sections: NonNullable<PublicInfoPageContent["sections"]> }) {
  return (
    <div className="mx-auto mt-12 max-w-3xl space-y-10">
      {sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-lg font-bold text-foreground">{section.heading}</h2>
          <div className="mt-4 space-y-3">
            {section.paragraphs.map((p) => (
              <p key={p} className="text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
          </div>
          {section.bullets && section.bullets.length > 0 ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function ContactBody({ items }: { items: NonNullable<PublicInfoPageContent["contactItems"]> }) {
  return (
    <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
            {item.label.toLowerCase().includes("phone") ? (
              <Phone className="h-5 w-5" />
            ) : item.label.toLowerCase().includes("office") ? (
              <MapPin className="h-5 w-5" />
            ) : (
              <Mail className="h-5 w-5" />
            )}
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">{item.label}</h3>
          {item.description ? (
            <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
          ) : null}
          {item.href ? (
            <a
              href={item.href}
              className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
            >
              {item.value}
            </a>
          ) : (
            <p className="mt-3 text-sm font-medium text-foreground">{item.value}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function CardsBody({ cards }: { cards: NonNullable<PublicInfoPageContent["cards"]> }) {
  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <h3 className="text-base font-semibold text-foreground">{card.title}</h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{card.description}</p>
          {card.ctaHref && card.ctaLabel ? (
            <Button asChild variant="outline" size="sm" className="mt-6 w-full">
              <Link href={card.ctaHref}>
                {card.ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function PublicInfoPage({
  content,
  enableRegistration = true,
}: {
  content: PublicInfoPageContent;
  enableRegistration?: boolean;
}) {
  const showDocumentAfterCards =
    content.variant === "cards" && content.sections && content.sections.length > 0;

  return (
    <div className="bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <PageHero
          eyebrow={content.eyebrow}
          title={content.title}
          subtitle={content.subtitle}
          lastUpdated={content.lastUpdated}
        />

        {content.variant === "document" && content.sections ? (
          <DocumentBody sections={content.sections} />
        ) : null}

        {content.variant === "contact" && content.contactItems ? (
          <ContactBody items={content.contactItems} />
        ) : null}

        {content.variant === "cards" && content.cards ? <CardsBody cards={content.cards} /> : null}

        {showDocumentAfterCards ? (
          <DocumentBody sections={content.sections!} />
        ) : null}

        <PublicMarketingBottomCta enableRegistration={enableRegistration} />
      </div>
    </div>
  );
}
