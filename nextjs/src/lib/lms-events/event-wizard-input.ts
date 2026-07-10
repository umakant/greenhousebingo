import { DEFAULT_HERO_TAGLINE, DEFAULT_BINGO_ROUNDS, detailContentToWizardFields } from "@/lib/lms-events/event-detail-content";
import { hydrateEventScheduleFields } from "@/lib/lms-events/event-schedule-helpers";
import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";
import type { LmsEvent, LmsEventTicket } from "@/lib/lms-events/types";

export const EXTRA_BINGO_CARD_TICKET_NAME = "Extra bingo card";
export const BONUS_CARD_TICKET_DESCRIPTION = "Additional bingo card for the same event";
export const DEFAULT_BONUS_CARD_NAME = "Bonus card";

export function isBonusBingoCardTicket(ticket: LmsEventTicket): boolean {
  return (
    ticket.description === BONUS_CARD_TICKET_DESCRIPTION ||
    ticket.name === EXTRA_BINGO_CARD_TICKET_NAME ||
    ticket.name === DEFAULT_BONUS_CARD_NAME
  );
}

export function pickPrimaryEventTicket(tickets: LmsEventTicket[]): LmsEventTicket | null {
  const primary = tickets.filter((t) => !isBonusBingoCardTicket(t));
  return primary[0] ?? tickets[0] ?? null;
}

export function pickBonusEventTicket(tickets: LmsEventTicket[]): LmsEventTicket | null {
  return tickets.find(isBonusBingoCardTicket) ?? null;
}

export function eventToWizardInput(event: LmsEvent, tickets: LmsEventTicket[] = []): LmsEventCreateWizardInput {
  const primary = pickPrimaryEventTicket(tickets);
  const bonusTicket = pickBonusEventTicket(tickets);
  const pageFields = detailContentToWizardFields(event.detailContent ?? null);
  const schedule = hydrateEventScheduleFields({
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    doorsOpen: event.doorsOpen,
    bingoStart: event.bingoStart,
    bingoEnd: pageFields.bingoEnd,
  });

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
    instructorUserId: event.instructorUserId ?? "",
    isPublic: event.isPublic,
    certificationAvailable: event.certificationAvailable,
    certificationName: event.certificationName ?? "",
    requirements: event.requirements ?? "",
    eventDate: schedule.eventDate,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
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
    doorsOpen: schedule.doorsOpen,
    bingoStart: schedule.bingoStart,
    venueType: (event.venueType as LmsEventCreateWizardInput["venueType"]) ?? "Brewery",
    venueAge21Plus: pageFields.venueAge21Plus ?? event.ageRule === "21+",
    venueDrinksAlcohol: pageFields.venueDrinksAlcohol ?? false,
    venueFood: pageFields.venueFood ?? false,
    cardsIncluded: event.cardsIncluded ?? 2,
    extraCardPrice: event.extraCardPrice ?? bonusTicket?.price ?? 5,
    bonusCardName: bonusTicket?.name ?? DEFAULT_BONUS_CARD_NAME,
    foodAndDrinks: event.foodAndDrinks ?? "",
    attire: event.attire ?? "Casual",
    regionTag: pageFields.regionTag ?? "",
    heroTagline: pageFields.heroTagline ?? DEFAULT_HERO_TAGLINE,
    descriptionTitle: pageFields.descriptionTitle ?? "",
    bingoEnd: schedule.bingoEnd,
    venuePhone: pageFields.venuePhone ?? "",
    agePolicyText: pageFields.agePolicyText ?? "",
    cardFeePercent: pageFields.cardFeePercent ?? 3.5,
    soldOut: pageFields.soldOut ?? event.status === "sold_out",
    hostName: pageFields.hostName ?? "",
    hostBio: pageFields.hostBio ?? "",
    hostImageUrl: pageFields.hostImageUrl ?? "",
    sponsorName: pageFields.sponsorName ?? "",
    sponsorAddress: pageFields.sponsorAddress ?? "",
    sponsorPhone: pageFields.sponsorPhone ?? "",
    sponsorPerk: pageFields.sponsorPerk ?? "",
    whatsIncludedText: pageFields.whatsIncludedText ?? "",
    checkInStepsText: pageFields.checkInStepsText ?? "",
    bingoRounds: pageFields.bingoRounds ?? [...DEFAULT_BINGO_ROUNDS],
    bingoGameIds: pageFields.bingoGameIds ?? [],
    faqIds: pageFields.faqIds ?? [],
    faqs: pageFields.faqs ?? [],
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
