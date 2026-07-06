import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicEventDetailView } from "@/components/events/public-event-detail-view";
import { StorefrontLiquidReactChrome } from "@/components/storefront/public/storefront-liquid-react-chrome";
import { mapStorefrontEventDtoToEventItem } from "@/lib/events";
import { resolveStorefrontShellContextFromHeaders } from "@/lib/storefront/resolve-storefront-shell-context";
import {
  getPublishedEventBySlug,
  rowToDto,
} from "@/lib/storefront/storefront-events-prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
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
  const ctx = await resolveStorefrontShellContextFromHeaders();

  if (!ctx) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium text-foreground">Storefront not configured</p>
        <p className="max-w-md text-sm">
          No active storefront domain matches this hostname. Attach a domain in Storefronts → Websites.
        </p>
      </div>
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
