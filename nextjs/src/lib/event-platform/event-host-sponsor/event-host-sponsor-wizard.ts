import type { EventHostDto } from "@/lib/event-platform/hosts/host-types";
import type { EventSponsorDto } from "@/lib/event-platform/sponsors/sponsor-types";
import type { LmsEventDetailHost, LmsEventDetailSponsor } from "@/lib/lms-events/event-detail-content";

export function hostDtoToDetailHost(host: EventHostDto): LmsEventDetailHost {
  return {
    catalogHostId: host.id,
    name: host.displayName,
    bio: host.bio ?? "",
    imageUrl: host.imageUrl ?? undefined,
  };
}

export function sponsorDtoToDetailSponsor(sponsor: EventSponsorDto): LmsEventDetailSponsor {
  return {
    catalogSponsorId: sponsor.id,
    name: sponsor.name,
    address: sponsor.address ?? "",
    phone: sponsor.phone ?? "",
    perk: sponsor.perk ?? "",
  };
}

export function hostsFromIds(catalog: EventHostDto[], ids: string[]): LmsEventDetailHost[] {
  return ids
    .map((id) => catalog.find((h) => h.id === id))
    .filter((h): h is EventHostDto => Boolean(h))
    .map(hostDtoToDetailHost);
}

export function sponsorsFromIds(catalog: EventSponsorDto[], ids: string[]): LmsEventDetailSponsor[] {
  return ids
    .map((id) => catalog.find((s) => s.id === id))
    .filter((s): s is EventSponsorDto => Boolean(s))
    .map(sponsorDtoToDetailSponsor);
}

/** Ensure at least one picker row; trailing empty row allowed for new selection. */
export function normalizePickerRows(ids: string[] | undefined): string[] {
  if (!ids?.length) return [""];
  return ids;
}

export function addPickerRow(ids: string[] | undefined): string[] {
  const rows = normalizePickerRows(ids);
  if (rows[rows.length - 1] === "") return rows;
  return [...rows, ""];
}

export function setPickerRow(ids: string[] | undefined, index: number, value: string): string[] {
  const rows = normalizePickerRows(ids);
  const next = [...rows];
  next[index] = value;
  return next;
}

export function removePickerRow(ids: string[] | undefined, index: number): string[] {
  const rows = normalizePickerRows(ids).filter((_, i) => i !== index);
  return rows.length ? rows : [""];
}

export function selectedPickerIds(rows: string[]): string[] {
  return rows.filter(Boolean);
}
