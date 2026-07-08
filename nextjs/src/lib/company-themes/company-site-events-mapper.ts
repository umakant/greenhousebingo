import { parseDetailContent } from "@/lib/lms-events/event-detail-content";
import type { LmsEvent } from "@/lib/lms-events/types";
import type { CompanySiteEventCard, CompanySiteEventDetail } from "@/lib/company-themes/company-site-events-types";

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const TINTS = ["bg-lime/20", "bg-sage/20", "bg-sunny/20", "bg-secondary/60"];

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function publicEventSlug(dbSlug: string): string {
  const s = dbSlug.trim();
  if (s.startsWith("sgh-")) return s.slice(4);
  return s;
}

export function dbEventSlugCandidates(publicSlug: string): string[] {
  const slug = publicSlug.trim();
  if (!slug) return [];
  const candidates = [slug, `sgh-${slug}`];
  return [...new Set(candidates)];
}

function stateName(abbr: string | null | undefined): string {
  const code = String(abbr ?? "").trim().toUpperCase();
  return STATE_NAMES[code] ?? code;
}

function format12h(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function dayName(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function displayCity(event: LmsEvent): string {
  const city = event.venueCity?.trim() || "";
  if (city.toLowerCase() === "dallas" && event.venueState === "TX") {
    return "Dallas / Fort Worth";
  }
  return city;
}

function seatsLeft(event: LmsEvent): number {
  if (event.status === "sold_out") return 0;
  if (event.seatsRemaining != null) return Math.max(0, event.seatsRemaining);
  if (event.capacity != null) return Math.max(0, event.capacity - event.registeredCount);
  return 0;
}

function soldOut(event: LmsEvent): boolean {
  if (event.status === "sold_out") return true;
  return seatsLeft(event) <= 0;
}

function tintForIndex(i: number): string {
  return TINTS[i % TINTS.length] ?? "bg-lime/20";
}

export function mapLmsEventToCard(event: LmsEvent, index = 0): CompanySiteEventCard {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const detail = parseDetailContent(event.detailContent);
  const stateCode = String(event.venueState ?? "").trim().toUpperCase();

  return {
    slug: publicEventSlug(event.slug),
    month: MONTHS[start.getMonth()] ?? "JAN",
    day: String(start.getDate()).padStart(2, "0"),
    year: start.getFullYear(),
    city: displayCity(event),
    state: stateName(stateCode),
    stateCode,
    venue: event.venueName?.trim() || event.title,
    dayName: dayName(start),
    doorsOpen: event.doorsOpen?.trim() || format12h(start),
    time: event.bingoStart?.trim() || format12h(start),
    endTime: detail?.bingoEnd?.trim() || format12h(end),
    left: seatsLeft(event),
    price: event.isFree ? 0 : Number(event.priceFrom ?? 0),
    tint: tintForIndex(index),
    soldOut: soldOut(event),
    lat: event.venueLat ?? null,
    lng: event.venueLng ?? null,
  };
}

export function mapLmsEventToDetail(event: LmsEvent, index = 0): CompanySiteEventDetail {
  const card = mapLmsEventToCard(event, index);
  const detail = parseDetailContent(event.detailContent);
  const host = detail?.host ?? { name: event.instructorName ?? "", bio: "", imageUrl: "" };
  const sponsor = detail?.sponsor ?? { name: "", address: "", phone: "", perk: "" };
  const address = [event.venueAddress, event.venueCity, event.venueState, event.venuePostalCode]
    .filter(Boolean)
    .join(", ");

  return {
    ...card,
    title: event.title,
    description: event.description ?? event.shortDescription ?? "",
    address,
    venuePhone: detail?.venuePhone ?? "",
    under21: event.ageRule === "21+",
    foodAndDrinks: event.foodAndDrinks ?? "",
    host: {
      name: host.name || event.instructorName || "",
      bio: host.bio || "",
      imageUrl: host.imageUrl || "",
    },
    sponsor: {
      name: sponsor.name || "",
      address: sponsor.address || "",
      phone: sponsor.phone || "",
      perk: sponsor.perk || "",
    },
    heroTagline: detail?.heroTagline ?? "",
    descriptionTitle: detail?.descriptionTitle ?? event.title,
    whatsIncluded: detail?.whatsIncluded ?? [],
    checkInSteps: detail?.checkInSteps ?? [],
    bingoRounds: detail?.bingoRounds ?? [],
    faqs: detail?.faqs ?? [],
    cardFeePercent: detail?.cardFeePercent ?? 3.5,
    cardsIncluded: event.cardsIncluded ?? 10,
    extraCardPrice: event.extraCardPrice ?? 5,
  };
}
