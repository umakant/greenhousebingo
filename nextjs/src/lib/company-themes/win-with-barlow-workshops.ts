import siteWorkshops from "@/lib/company-themes/win-with-barlow-workshops.json";

export type WinWithBarlowWorkshop = {
  catalogId: string;
  slug: string;
  title: string;
  price: number;
  path: string;
  city: string;
  state: string;
  venueName: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  seatsRemaining: number;
  soldOut: boolean;
  monthLabel: string;
  dayOfMonth: number;
  dayLabel: string;
  instructorName: string;
  imageUrl: string;
  shortDescription: string;
  description: string;
  requirements: string;
  cancellationPolicy: string;
};

export type WinWithBarlowWorkshopSiteConfig = {
  themeSlug: string;
  defaultCompanySiteSlug: string;
  category: {
    slug: string;
    name: string;
    description: string;
  };
  workshops: WinWithBarlowWorkshop[];
};

export const WIN_WITH_BARLOW_WORKSHOP_SITE = siteWorkshops as WinWithBarlowWorkshopSiteConfig;

export const WIN_WITH_BARLOW_WORKSHOPS: WinWithBarlowWorkshop[] = WIN_WITH_BARLOW_WORKSHOP_SITE.workshops;

const bySlug = new Map(WIN_WITH_BARLOW_WORKSHOPS.map((w) => [w.slug, w]));
const byCatalogId = new Map(WIN_WITH_BARLOW_WORKSHOPS.map((w) => [w.catalogId, w]));

export function getWinWithBarlowWorkshopBySlug(slug: string): WinWithBarlowWorkshop | null {
  return bySlug.get(slug) ?? null;
}

export function getWinWithBarlowWorkshopByCatalogId(catalogId: string): WinWithBarlowWorkshop | null {
  return byCatalogId.get(catalogId) ?? null;
}

export function lmsWorkshopEventSlug(catalogSlug: string): string {
  return `cs-workshop-${catalogSlug}`;
}

export function workshopRegisteredCount(workshop: WinWithBarlowWorkshop): number {
  return Math.max(0, workshop.capacity - workshop.seatsRemaining);
}

export function workshopTicketStatus(workshop: WinWithBarlowWorkshop): "available" | "sold_out" {
  return workshop.soldOut || workshop.seatsRemaining <= 0 ? "sold_out" : "available";
}

export function makeWorkshopQrToken(eventId: bigint, orderReference: string, seatIndex: number): string {
  const part = orderReference.replace(/[^A-Z0-9]/gi, "").slice(-8).toUpperCase();
  return `WS-${eventId}-${part}-${seatIndex + 1}-${Date.now().toString(36).toUpperCase()}`;
}
