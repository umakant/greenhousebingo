import { DEFAULT_HERO_TAGLINE } from "@/lib/lms-events/event-detail-content";
import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";
import type { LmsEvent, LmsEventTicket } from "@/lib/lms-events/types";

export const EXTRA_BINGO_CARD_TICKET_NAME = "Extra bingo card";

export function pickPrimaryEventTicket(tickets: LmsEventTicket[]): LmsEventTicket | null {
  const primary = tickets.filter((t) => t.name !== EXTRA_BINGO_CARD_TICKET_NAME);
  return primary[0] ?? tickets[0] ?? null;
}

export function eventToWizardInput(event: LmsEvent, tickets: LmsEventTicket[] = []): LmsEventCreateWizardInput {
  const primary = pickPrimaryEventTicket(tickets);
  const extraFromTicket = tickets.find((t) => t.name === EXTRA_BINGO_CARD_TICKET_NAME);

  return {
    title: event.title,
    slug: event.slug,
    description: event.description ?? "",
    shortDescription: event.shortDescription ?? "",
    imageUrl: event.imageUrl ?? "",
    categoryId: event.categoryId ?? "",
    eventType: event.eventType,
    deliveryMode: event.deliveryMode,
    instructorName: event.instructorName ?? "",
    isPublic: event.isPublic,
    certificationAvailable: event.certificationAvailable,
    certificationName: event.certificationName ?? "",
    requirements: event.requirements ?? "",
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    venueName: event.venueName ?? "",
    venueAddress: event.venueAddress ?? "",
    venueCity: event.venueCity ?? "",
    venueState: event.venueState ?? "",
    venuePostalCode: event.venuePostalCode ?? "",
    venueCountry: event.venueCountry ?? "US",
    venueLat: event.venueLat,
    venueLng: event.venueLng,
    onlineMeetingUrl: event.onlineMeetingUrl ?? "",
    isFeatured: event.isFeatured,
    ageRule: (event.ageRule as LmsEventCreateWizardInput["ageRule"]) ?? "21+",
    doorsOpen: event.doorsOpen ?? "",
    bingoStart: event.bingoStart ?? "",
    venueType: (event.venueType as LmsEventCreateWizardInput["venueType"]) ?? "Brewery",
    cardsIncluded: event.cardsIncluded ?? 2,
    extraCardPrice: event.extraCardPrice ?? extraFromTicket?.price ?? 5,
    foodAndDrinks: event.foodAndDrinks ?? "",
    attire: event.attire ?? "Casual",
    regionTag: "",
    heroTagline: DEFAULT_HERO_TAGLINE,
    descriptionTitle: "",
    bingoEnd: "",
    venuePhone: "",
    agePolicyText: "",
    cardFeePercent: 3.5,
    soldOut: event.status === "sold_out",
    hostName: "",
    hostBio: "",
    hostImageUrl: "",
    sponsorName: "",
    sponsorAddress: "",
    sponsorPhone: "",
    sponsorPerk: "",
    whatsIncludedText: "",
    checkInStepsText: "",
    ticketName: primary?.name ?? "General admission",
    ticketDescription: primary?.description ?? "",
    price: primary?.price ?? event.priceFrom ?? 0,
    currency: primary?.currency ?? event.currency ?? "USD",
    quantity: primary?.quantity ?? event.capacity ?? 50,
    saleStartsAt: primary?.saleStartsAt ?? undefined,
    saleEndsAt: primary?.saleEndsAt ?? undefined,
    ticketStatus: primary?.ticketStatus ?? "available",
    isFree: primary?.isFree ?? event.isFree,
    capacity: event.capacity ?? primary?.quantity ?? 50,
    cancellationPolicy: event.cancellationPolicy ?? "",
    status: event.status,
  };
}
