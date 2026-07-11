import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";

export const LMS_EVENT_BINGO_DIFFICULTIES = ["Easy", "Medium", "Hard", "Epic"] as const;
export type LmsEventBingoDifficulty = (typeof LMS_EVENT_BINGO_DIFFICULTIES)[number];

export type LmsEventBingoRound = {
  roundNumber: number;
  name: string;
  pattern: string;
  difficulty: LmsEventBingoDifficulty;
  prize: string;
  imageUrl?: string;
};

export type LmsEventFaq = {
  question: string;
  answer: string;
};

export type LmsEventDetailHost = {
  name: string;
  bio: string;
  imageUrl?: string;
  catalogHostId?: string;
};

export type LmsEventDetailSponsor = {
  name: string;
  address: string;
  phone: string;
  perk: string;
  catalogSponsorId?: string;
  package?: string;
  contribution?: number;
  paymentStatus?: string;
  deliverables?: string[];
  completedDeliverables?: string[];
  notes?: string;
  agreementUrl?: string;
};

export type LmsEventVenueAmenities = {
  age21Plus?: boolean;
  drinksAlcohol?: boolean;
  food?: boolean;
};

/** Event-scoped venue/host operational fields (not catalog duplicates). */
export type LmsEventVenueHostOps = {
  catalogVenueId?: string;
  catalogHostId?: string;
  venueFee?: number;
  contractStatus?: string;
  venuePaymentStatus?: string;
  setupInstructions?: string;
  parking?: string;
  accessibility?: string;
  venueNotes?: string;
  contractUrl?: string;
  scheduledHostArrival?: string;
  actualHostArrival?: string;
  hostPaymentType?: string;
  hostPaymentAmount?: number;
  hostPaymentStatus?: string;
  agreementUrl?: string;
  hostNotes?: string;
};

/** Rich public event page content (Plant Bingo detail template). */
export type LmsEventDetailContent = {
  regionTag?: string;
  heroTagline?: string;
  descriptionTitle?: string;
  bingoEnd?: string;
  venuePhone?: string;
  agePolicyText?: string;
  cardFeePercent?: number;
  soldOut?: boolean;
  venueAmenities?: LmsEventVenueAmenities;
  venueHostOps?: LmsEventVenueHostOps;
  host?: LmsEventDetailHost;
  hosts?: LmsEventDetailHost[];
  hostIds?: string[];
  sponsor?: LmsEventDetailSponsor;
  sponsors?: LmsEventDetailSponsor[];
  sponsorIds?: string[];
  whatsIncluded?: string[];
  checkInSteps?: string[];
  bingoRounds?: LmsEventBingoRound[];
  bingoGameIds?: string[];
  faqIds?: string[];
  faqs?: LmsEventFaq[];
  bonusCardsAllowed?: boolean;
};

export const DEFAULT_BINGO_ROUNDS: LmsEventBingoRound[] = [
  { roundNumber: 1, name: "Traditional Bingo", pattern: "Any line — horizontal, vertical, or diagonal", difficulty: "Easy", prize: "Pothos" },
  { roundNumber: 2, name: "Four Corners", pattern: "Mark all four corner squares", difficulty: "Easy", prize: "Succulent" },
  { roundNumber: 3, name: "Blackout", pattern: "Cover the entire card", difficulty: "Hard", prize: "Monstera" },
  { roundNumber: 4, name: "Letter X", pattern: "Both diagonals form an X", difficulty: "Medium", prize: "Snake Plant" },
  { roundNumber: 5, name: "Picture Frame", pattern: "Complete the outer border", difficulty: "Medium", prize: "Peace Lily" },
  { roundNumber: 6, name: "Postage Stamp", pattern: "2x2 block in any corner", difficulty: "Easy", prize: "Succulent" },
  { roundNumber: 7, name: "Double Bingo", pattern: "Two winning lines", difficulty: "Medium", prize: "Rubber Plant" },
  { roundNumber: 8, name: "Lucky Leaf Pattern", pattern: "Leaf-shaped pattern on card", difficulty: "Hard", prize: "Fern" },
  { roundNumber: 9, name: "Crazy Garden Pattern", pattern: "Surprise pattern revealed live", difficulty: "Hard", prize: "Orchid" },
  { roundNumber: 10, name: "Wild Card Finale", pattern: "Winner picks any plant on the floor", difficulty: "Epic", prize: "Your Choice" },
];

export const DEFAULT_EVENT_FAQS: LmsEventFaq[] = [
  {
    question: "How do I get in?",
    answer:
      "After purchase you'll receive an email with a unique QR code for each ticket. Show the QR code at the door and we'll scan you in.",
  },
  {
    question: "How many plants do I take home?",
    answer: "One plant per ticket purchased. Buy 2 tickets, take home 2 plants.",
  },
  {
    question: "Can I buy tickets at the door?",
    answer: "No. Tickets are online only so we can guarantee a plant for every guest.",
  },
  {
    question: "What about extra Bingo cards?",
    answer:
      "Your ticket includes bingo cards. You can add more for a small fee — during purchase or at the door if any are left.",
  },
  {
    question: "Is there a fee?",
    answer: "A 3.5% card processing fee is added at checkout. Everything else you see is the final price.",
  },
  {
    question: "What if I can't make it?",
    answer:
      "Tickets are transferable — forward your QR email to a friend. We do not offer refunds under 48 hours before the event.",
  },
];

export const DEFAULT_WHATS_INCLUDED = [
  "Bingo cards included with ticket",
  "Complimentary adult beverages",
  "Multiple rounds of Plant Bingo",
  "One guaranteed take-home plant",
  "Light refreshments",
  "Sponsor discount card",
];

export const DEFAULT_CHECKIN_STEPS = [
  "Buy online — we'll generate a QR code for each ticket.",
  "Check your email — your QR codes arrive instantly.",
  "Scan at the door — our host scans your QR code and hands you your cards.",
  "Pick up plants at the end — one plant per ticket purchased.",
];

export const DEFAULT_HERO_TAGLINE = "Everyone Leaves With a Plant. 🌿 Guaranteed.";

function linesFromText(text: string | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function defaultAgePolicyText(ageRule: string | null | undefined): string {
  switch (ageRule) {
    case "21+":
      return "21+ only. Valid ID required at the door.";
    case "Family":
      return "All ages welcome. Under 21 must be accompanied by an adult.";
    case "All ages":
      return "All ages welcome. Family-friendly event.";
    default:
      return "All ages welcome. Under 21 must be accompanied by an adult.";
  }
}

export function defaultDescriptionTitle(venueName: string | undefined): string {
  const venue = (venueName ?? "").trim();
  return venue ? `You're Invited to Plant Bingo at ${venue}!` : "You're Invited to Plant Bingo!";
}

export function regionTagFromState(state: string | undefined): string {
  const s = (state ?? "").trim();
  if (!s) return "";
  if (s.length <= 3) return s.toUpperCase();
  return s;
}

export function buildDetailContentFromWizardInput(input: LmsEventCreateWizardInput): LmsEventDetailContent {
  const whatsIncluded = linesFromText(input.whatsIncludedText);
  const checkInSteps = linesFromText(input.checkInStepsText);

  const hostName = input.hostName?.trim() || input.instructorName?.trim();
  const fallbackHost: LmsEventDetailHost | undefined = hostName
    ? {
        name: hostName,
        bio: input.hostBio?.trim() || "",
        imageUrl: input.hostImageUrl?.trim() || undefined,
        catalogHostId: input.hostIds?.[0],
      }
    : undefined;

  const sponsorName = input.sponsorName?.trim();
  const fallbackSponsor: LmsEventDetailSponsor | undefined = sponsorName
    ? {
        name: sponsorName,
        address: input.sponsorAddress?.trim() || "",
        phone: input.sponsorPhone?.trim() || "",
        perk: input.sponsorPerk?.trim() || "",
        catalogSponsorId: input.sponsorIds?.[0],
      }
    : undefined;

  const normalizeHost = (h: {
    name: string;
    catalogHostId?: string;
    bio?: string;
    imageUrl?: string;
  }): LmsEventDetailHost => ({
    name: h.name,
    bio: h.bio?.trim() || "",
    imageUrl: h.imageUrl?.trim() || undefined,
    catalogHostId: h.catalogHostId,
  });

  const normalizeSponsor = (s: {
    name: string;
    catalogSponsorId?: string;
    address?: string;
    phone?: string;
    perk?: string;
  }): LmsEventDetailSponsor => ({
    name: s.name,
    address: s.address?.trim() || "",
    phone: s.phone?.trim() || "",
    perk: s.perk?.trim() || "",
    catalogSponsorId: s.catalogSponsorId,
  });

  const rosterHosts = input.hosts?.length
    ? input.hosts.map(normalizeHost)
    : fallbackHost
      ? [fallbackHost]
      : undefined;
  const rosterSponsors = input.sponsors?.length
    ? input.sponsors.map(normalizeSponsor)
    : fallbackSponsor
      ? [fallbackSponsor]
      : undefined;
  const primaryHost = rosterHosts?.[0];
  const primarySponsor = rosterSponsors?.[0];

  return {
    regionTag: input.regionTag?.trim() || regionTagFromState(input.venueState) || undefined,
    heroTagline: input.heroTagline?.trim() || DEFAULT_HERO_TAGLINE,
    descriptionTitle:
      input.descriptionTitle?.trim() ||
      (input.title?.trim() ? `You're Invited to ${input.title.trim()}!` : undefined) ||
      defaultDescriptionTitle(input.venueName) ||
      undefined,
    bingoEnd: input.bingoEnd?.trim() || undefined,
    venuePhone: input.venuePhone?.trim() || undefined,
    agePolicyText: input.agePolicyText?.trim() || defaultAgePolicyText(input.ageRule) || undefined,
    cardFeePercent: input.cardFeePercent ?? 3.5,
    soldOut: input.soldOut ?? false,
    venueAmenities: {
      age21Plus: input.venueAge21Plus ?? false,
      drinksAlcohol: input.venueDrinksAlcohol ?? false,
      food: input.venueFood ?? false,
    },
    host: primaryHost,
    hosts: rosterHosts,
    hostIds: input.hostIds?.length ? input.hostIds : primaryHost?.catalogHostId ? [primaryHost.catalogHostId] : undefined,
    sponsor: primarySponsor,
    sponsors: rosterSponsors,
    sponsorIds:
      input.sponsorIds?.length
        ? input.sponsorIds
        : primarySponsor?.catalogSponsorId
          ? [primarySponsor.catalogSponsorId]
          : undefined,
    whatsIncluded: whatsIncluded.length > 0 ? whatsIncluded : [...DEFAULT_WHATS_INCLUDED],
    checkInSteps: checkInSteps.length > 0 ? checkInSteps : [...DEFAULT_CHECKIN_STEPS],
    bingoRounds: input.bingoRounds?.length ? input.bingoRounds : [...DEFAULT_BINGO_ROUNDS],
    bingoGameIds: input.bingoGameIds?.length ? input.bingoGameIds : undefined,
    faqIds: input.faqIds?.length ? input.faqIds : undefined,
    faqs: input.faqs?.length ? input.faqs : undefined,
    bonusCardsAllowed: input.bonusCardsAllowed !== false,
  };
}

export function parseDetailContent(raw: unknown): LmsEventDetailContent | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return parseDetailContent(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    regionTag: typeof o.regionTag === "string" ? o.regionTag : undefined,
    heroTagline: typeof o.heroTagline === "string" ? o.heroTagline : undefined,
    descriptionTitle: typeof o.descriptionTitle === "string" ? o.descriptionTitle : undefined,
    bingoEnd: typeof o.bingoEnd === "string" ? o.bingoEnd : undefined,
    venuePhone: typeof o.venuePhone === "string" ? o.venuePhone : undefined,
    agePolicyText: typeof o.agePolicyText === "string" ? o.agePolicyText : undefined,
    cardFeePercent: typeof o.cardFeePercent === "number" ? o.cardFeePercent : undefined,
    soldOut: o.soldOut === true,
    venueAmenities:
      o.venueAmenities && typeof o.venueAmenities === "object"
        ? (o.venueAmenities as LmsEventVenueAmenities)
        : undefined,
    venueHostOps:
      o.venueHostOps && typeof o.venueHostOps === "object"
        ? (o.venueHostOps as LmsEventVenueHostOps)
        : undefined,
    host: o.host && typeof o.host === "object" ? (o.host as LmsEventDetailHost) : undefined,
    hosts: Array.isArray(o.hosts) ? (o.hosts as LmsEventDetailHost[]) : undefined,
    hostIds: Array.isArray(o.hostIds) ? o.hostIds.filter((x): x is string => typeof x === "string") : undefined,
    sponsor: o.sponsor && typeof o.sponsor === "object" ? (o.sponsor as LmsEventDetailSponsor) : undefined,
    sponsors: Array.isArray(o.sponsors) ? (o.sponsors as LmsEventDetailSponsor[]) : undefined,
    sponsorIds: Array.isArray(o.sponsorIds)
      ? o.sponsorIds.filter((x): x is string => typeof x === "string")
      : undefined,
    whatsIncluded: Array.isArray(o.whatsIncluded)
      ? o.whatsIncluded.filter((x): x is string => typeof x === "string")
      : undefined,
    checkInSteps: Array.isArray(o.checkInSteps)
      ? o.checkInSteps.filter((x): x is string => typeof x === "string")
      : undefined,
    bingoRounds: Array.isArray(o.bingoRounds) ? (o.bingoRounds as LmsEventBingoRound[]) : undefined,
    bingoGameIds: Array.isArray(o.bingoGameIds)
      ? o.bingoGameIds.filter((x): x is string => typeof x === "string")
      : undefined,
    faqIds: Array.isArray(o.faqIds) ? o.faqIds.filter((x): x is string => typeof x === "string") : undefined,
    faqs: Array.isArray(o.faqs) ? (o.faqs as LmsEventFaq[]) : undefined,
    bonusCardsAllowed: o.bonusCardsAllowed === false ? false : o.bonusCardsAllowed === true ? true : undefined,
  };
}

export function detailContentToWizardFields(content: LmsEventDetailContent | null): Partial<LmsEventCreateWizardInput> {
  if (!content) return {};
  return {
    regionTag: content.regionTag ?? "",
    heroTagline: content.heroTagline ?? "",
    descriptionTitle: content.descriptionTitle ?? "",
    bingoEnd: content.bingoEnd ?? "",
    venuePhone: content.venuePhone ?? "",
    agePolicyText: content.agePolicyText ?? "",
    cardFeePercent: content.cardFeePercent ?? 3.5,
    soldOut: content.soldOut ?? false,
    venueAge21Plus: content.venueAmenities?.age21Plus ?? false,
    venueDrinksAlcohol: content.venueAmenities?.drinksAlcohol ?? false,
    venueFood: content.venueAmenities?.food ?? false,
    hostName: content.host?.name ?? content.hosts?.[0]?.name ?? "",
    hostBio: content.host?.bio ?? content.hosts?.[0]?.bio ?? "",
    hostImageUrl: content.host?.imageUrl ?? content.hosts?.[0]?.imageUrl ?? "",
    hostIds: content.hostIds?.length
      ? content.hostIds
      : content.hosts?.map((h) => h.catalogHostId).filter((id): id is string => Boolean(id)) ??
        (content.host?.catalogHostId ? [content.host.catalogHostId] : []),
    hosts: content.hosts?.length ? content.hosts : content.host ? [content.host] : [],
    sponsorName: content.sponsor?.name ?? content.sponsors?.[0]?.name ?? "",
    sponsorAddress: content.sponsor?.address ?? content.sponsors?.[0]?.address ?? "",
    sponsorPhone: content.sponsor?.phone ?? content.sponsors?.[0]?.phone ?? "",
    sponsorPerk: content.sponsor?.perk ?? content.sponsors?.[0]?.perk ?? "",
    sponsorIds: content.sponsorIds?.length
      ? content.sponsorIds
      : content.sponsors?.map((s) => s.catalogSponsorId).filter((id): id is string => Boolean(id)) ??
        (content.sponsor?.catalogSponsorId ? [content.sponsor.catalogSponsorId] : []),
    sponsors: content.sponsors?.length ? content.sponsors : content.sponsor ? [content.sponsor] : [],
    whatsIncludedText: (content.whatsIncluded ?? []).join("\n"),
    checkInStepsText: (content.checkInSteps ?? []).join("\n"),
    bingoRounds: content.bingoRounds?.length ? content.bingoRounds : [...DEFAULT_BINGO_ROUNDS],
    bingoGameIds: content.bingoGameIds ?? [],
    faqIds: content.faqIds ?? [],
    faqs: content.faqs ?? [],
    bonusCardsAllowed: content.bonusCardsAllowed !== false,
  };
}

export function plantBingoDetailDefaultsForSeed(ev: {
  venueName?: string;
  venueState?: string;
  venuePhone?: string;
  ageRule?: string;
  cardsIncluded?: number;
  bingoStart?: string;
  doorsOpen?: string;
  soldOut?: boolean;
  hostName?: string;
  hostBio?: string;
  sponsor?: { name: string; address: string; phone: string; perk: string };
}) {
  const content = buildDetailContentFromWizardInput({
    title: ev.venueName ?? "Plant Bingo",
    categoryId: "1",
    eventType: "live_workshop",
    deliveryMode: "in_person",
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    venueName: ev.venueName,
    venueState: ev.venueState,
    ageRule: ev.ageRule as LmsEventCreateWizardInput["ageRule"],
    doorsOpen: ev.doorsOpen,
    bingoStart: ev.bingoStart,
    bingoEnd: "9:00 PM",
    venuePhone: ev.venuePhone,
    cardsIncluded: ev.cardsIncluded ?? 10,
    hostName: ev.hostName,
    hostBio: ev.hostBio,
    sponsorName: ev.sponsor?.name,
    sponsorAddress: ev.sponsor?.address,
    sponsorPhone: ev.sponsor?.phone,
    sponsorPerk: ev.sponsor?.perk,
    soldOut: ev.soldOut ?? false,
    ticketName: "General admission",
    price: 30,
    status: "registration_open",
    whatsIncludedText: [
      `${ev.cardsIncluded ?? 10} Bingo cards`,
      "Complimentary adult beverages",
      "10 rounds of Plant Bingo",
      "One guaranteed take-home plant",
      "Light refreshments",
      "Sponsor discount card",
    ].join("\n"),
  } as LmsEventCreateWizardInput);
  return content;
}
