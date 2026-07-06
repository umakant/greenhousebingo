import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicEventDetailView } from "@/components/events/public-event-detail-view";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { EventDetailContent } from "@/components/greenhouse-bingo/event-detail";
import { StorefrontLiquidReactChrome } from "@/components/storefront/public/storefront-liquid-react-chrome";
import { mapStorefrontEventDtoToEventItem } from "@/lib/events";
import { events, getEventById } from "@/lib/greenhouse-bingo/mock";
import { resolveStorefrontShellContextFromHeaders } from "@/lib/storefront/resolve-storefront-shell-context";
import {
  getPublishedEventBySlug,
  rowToDto,
} from "@/lib/storefront/storefront-events-prisma";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return events.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const ghEvent = getEventById(slug);
  if (ghEvent) {
    return {
      title: `${ghEvent.title} — Greenhouse Bingo`,
      description: ghEvent.description,
    };
  }

  const ctx = await resolveStorefrontShellContextFromHeaders();
  if (!ctx) {
    return { title: "Event" };
  }

  const row = await getPublishedEventBySlug(ctx.organizationId, ctx.websiteId, slug);
  if (!row) {
    return { title: "Event not found" };
  }

  const description = (row.description ?? "").trim() || `Join us for ${row.title}.`;
  return {
    title: row.title,
    description,
    openGraph: {
      title: row.title,
      description,
      images: row.image_url?.trim() ? [{ url: row.image_url.trim() }] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const ghEvent = getEventById(slug);

  if (ghEvent) {
    return (
      <GhBingoShell>
        <EventDetailContent event={ghEvent} />
      </GhBingoShell>
    );
  }

  const ctx = await resolveStorefrontShellContextFromHeaders();

  if (!ctx) {
    return (
      <GhBingoShell>
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="font-display text-4xl">Event not found</h1>
          <p className="mt-3 text-muted-foreground">
            This event may have ended or been moved.
          </p>
          <Button asChild className="mt-6">
            <Link href="/events">Browse all events</Link>
          </Button>
        </div>
      </GhBingoShell>
    );
  }

  const row = await getPublishedEventBySlug(ctx.organizationId, ctx.websiteId, slug);
  if (!row) notFound();

  const event = mapStorefrontEventDtoToEventItem(rowToDto(row));

  if (ctx.themeChromeHtml) {
    return (
      <StorefrontLiquidReactChrome
        html={ctx.themeChromeHtml}
        style={ctx.cssVars as CSSProperties}
        storefrontCurrency={ctx.publicSettings.currencyDisplay?.trim() || "USD"}
      >
        <PublicEventDetailView event={event} themeChrome />
      </StorefrontLiquidReactChrome>
    );
  }

  return (
    <main className="min-h-screen bg-background" style={ctx.cssVars as CSSProperties}>
      <PublicEventDetailView event={event} />
    </main>
  );
}
