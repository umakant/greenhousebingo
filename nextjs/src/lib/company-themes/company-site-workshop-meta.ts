import "server-only";

import type { CompanySiteCatalogItem } from "@/lib/company-themes/win-with-barlow-catalog";
import {
  getWinWithBarlowWorkshopByCatalogId,
  getWinWithBarlowWorkshopBySlug,
  type WinWithBarlowWorkshop,
} from "@/lib/company-themes/win-with-barlow-workshops";

export type WorkshopVenueMeta = {
  city: string;
  state: string;
  venueName: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  seatsRemaining: number;
  soldOut: boolean;
};

function toVenueMeta(workshop: WinWithBarlowWorkshop): WorkshopVenueMeta {
  return {
    city: workshop.city,
    state: workshop.state,
    venueName: workshop.venueName,
    startsAt: new Date(workshop.startsAt),
    endsAt: new Date(workshop.endsAt),
    capacity: workshop.capacity,
    seatsRemaining: workshop.seatsRemaining,
    soldOut: workshop.soldOut,
  };
}

/** Static schedule metadata keyed by catalog slug — sourced from win-with-barlow-workshops.json */
export const WORKSHOP_VENUE_META: Record<string, WorkshopVenueMeta> = Object.fromEntries(
  ["las-vegas", "jackson-ms", "chicago-il", "indianapolis"].map((slug) => {
    const workshop = getWinWithBarlowWorkshopBySlug(slug);
    return workshop ? [slug, toVenueMeta(workshop)] : null;
  }).filter(Boolean) as Array<[string, WorkshopVenueMeta]>,
);

export function workshopCatalogSlug(item: CompanySiteCatalogItem): string | null {
  if (item.type !== "workshop") return null;
  return item.slug;
}

export function getWorkshopVenueMetaForCatalogItem(catalogId: string): WorkshopVenueMeta | null {
  const workshop = getWinWithBarlowWorkshopByCatalogId(catalogId);
  return workshop ? toVenueMeta(workshop) : null;
}

export { lmsWorkshopEventSlug, makeWorkshopQrToken } from "@/lib/company-themes/win-with-barlow-workshops";
