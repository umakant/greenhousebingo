/** Theme-compatible event card shape (plant-bingo-bash). */
export type CompanySiteEventCard = {
  slug: string;
  month: string;
  day: string;
  year: number;
  city: string;
  state: string;
  stateCode: string;
  venue: string;
  dayName: string;
  doorsOpen: string;
  time: string;
  endTime: string;
  left: number;
  price: number;
  tint: string;
  soldOut: boolean;
  lat: number | null;
  lng: number | null;
};

export type CompanySiteEventDetail = CompanySiteEventCard & {
  title: string;
  description: string;
  address: string;
  venuePhone: string;
  under21: boolean;
  foodAndDrinks: string;
  host: { name: string; bio: string; imageUrl: string };
  sponsor: { name: string; address: string; phone: string; perk: string };
  heroTagline: string;
  descriptionTitle: string;
  whatsIncluded: string[];
  checkInSteps: string[];
  bingoRounds: Array<{
    roundNumber: number;
    name: string;
    pattern: string;
    difficulty: string;
    prize: string;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  cardFeePercent: number;
  cardsIncluded: number;
  extraCardPrice: number;
};

export type CompanySiteEventsListPayload = {
  ok: true;
  events: CompanySiteEventCard[];
  total: number;
  stateCount: number;
};

export type CompanySiteEventDetailPayload = {
  ok: true;
  event: CompanySiteEventDetail;
};
