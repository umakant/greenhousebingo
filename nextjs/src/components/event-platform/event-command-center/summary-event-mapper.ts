import type { EventCommandCenterSummary } from "@/lib/event-platform/command-center/command-center-types";
import type { LmsEvent } from "@/lib/lms-events/types";

/** Map command-center summary event into LmsEvent shape for existing tab components. */
export function summaryEventToLmsEvent(summary: EventCommandCenterSummary): LmsEvent {
  const e = summary.event;
  const remaining =
    summary.counts.remainingCapacity.availability === "available"
      ? (summary.counts.remainingCapacity.value ?? null)
      : e.capacity != null
        ? Math.max(0, e.capacity - summary.counts.registrations)
        : null;

  return {
    id: e.id,
    organizationId: "",
    createdAt: e.startsAt,
    updatedAt: e.startsAt,
    createdById: null,
    updatedById: null,
    status: e.status as LmsEvent["status"],
    title: e.title,
    slug: e.slug,
    description: e.description,
    shortDescription: e.shortDescription,
    imageUrl: null,
    categoryId: null,
    categoryName: null,
    eventType: e.eventType as LmsEvent["eventType"],
    deliveryMode: "in_person",
    instructorName: e.host.name,
    instructorUserId: null,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    timezone: e.timezone,
    venueName: e.venue.name,
    venueAddress: e.venue.address,
    venueCity: e.venue.city,
    venueState: e.venue.state,
    venuePostalCode: e.venue.postalCode,
    venueCountry: e.venue.country,
    venueLat: null,
    venueLng: null,
    onlineMeetingUrl: null,
    capacity: e.capacity,
    registeredCount: summary.counts.registrations,
    seatsRemaining: remaining,
    isPublic: e.isPublic,
    isFree: e.isFree,
    priceFrom: e.priceFrom,
    currency: e.currency,
    certificationAvailable: false,
    certificationName: null,
    requirements: null,
    cancellationPolicy: null,
    isFeatured: e.isFeatured,
    ageRule: e.ageRule,
    doorsOpen: e.doorsOpen,
    bingoStart: e.bingoStart,
    venueType: e.venue.type,
    cardsIncluded: e.cardsIncluded,
    extraCardPrice: e.extraCardPrice,
    foodAndDrinks: e.foodAndDrinks,
    attire: e.attire,
    linkedCourseId: null,
    linkedLiveSessionId: null,
    revenueTotal:
      summary.financial.grossRevenue.availability === "available"
        ? (summary.financial.grossRevenue.value ?? 0)
        : 0,
    detailContent: e.detailContent,
  };
}
