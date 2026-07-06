export type Company = {
  slug: string;
  name: string;
  tagline: string;
  about: string;
  city: string;
  state: string;
  serviceArea: string;
  logoInitials: string;
  accentColor: string;
  website?: string;
  instagram?: string;
  featured?: boolean;
};

export type Venue = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  type: string;
  capacity: number;
  ageRule: "21+" | "All ages" | "Family";
};

export type BingoEvent = {
  id: string;
  slug: string;
  title: string;
  companySlug: string;
  venueId: string;
  date: string;
  doorsOpen: string;
  bingoStart: string;
  price: number;
  extraCardPrice: number;
  cardsIncluded: number;
  ageRule: "21+" | "All ages" | "Family";
  attire: string;
  foodNote: string;
  description: string;
  capacity: number;
  ticketsSold: number;
  featured?: boolean;
};

export const companies: Company[] = [
  {
    slug: "the-social-greenhouse",
    name: "The Social Greenhouse",
    tagline: "Plant bingo nights across the Twin Cities",
    about:
      "The Social Greenhouse hosts plant bingo events at breweries, cideries, and nurseries — bringing houseplants, drinks, and good company together.",
    city: "Minneapolis",
    state: "MN",
    serviceArea: "Twin Cities Metro",
    logoInitials: "SG",
    accentColor: "leaf",
    instagram: "@thesocialgreenhouse",
    featured: true,
  },
  {
    slug: "cidersmith-rep",
    name: "Cidersmith Bingo Co.",
    tagline: "Cider + plants + winning cards",
    about:
      "Family-run rep hosting plant bingo at cideries and taprooms across the Hudson Valley.",
    city: "Kingston",
    state: "NY",
    serviceArea: "Hudson Valley, NY",
    logoInitials: "CB",
    accentColor: "clay",
    featured: true,
  },
  {
    slug: "sunroom-social",
    name: "Sunroom Social",
    tagline: "Weeknight bingo with a botanical twist",
    about:
      "Austin-based rep bringing greenhouse bingo to bars, taquerias, and plant shops around Central Texas.",
    city: "Austin",
    state: "TX",
    serviceArea: "Austin & Central TX",
    logoInitials: "SS",
    accentColor: "moss",
    featured: true,
  },
  {
    slug: "pnw-fern-club",
    name: "PNW Fern Club",
    tagline: "Rain-or-shine bingo in the Pacific Northwest",
    about: "Portland rep hosting family-friendly and 21+ nights at breweries and nurseries.",
    city: "Portland",
    state: "OR",
    serviceArea: "Portland Metro",
    logoInitials: "PF",
    accentColor: "leaf",
  },
];

export const venues: Venue[] = [
  {
    id: "v1",
    name: "Sidelake Brewing",
    address: "1401 Marshall St NE",
    city: "Minneapolis",
    state: "MN",
    type: "Brewery",
    capacity: 120,
    ageRule: "21+",
  },
  {
    id: "v2",
    name: "Bachman's Greenhouse",
    address: "6010 Lyndale Ave S",
    city: "Minneapolis",
    state: "MN",
    type: "Greenhouse",
    capacity: 80,
    ageRule: "Family",
  },
  {
    id: "v3",
    name: "Kingston Cider House",
    address: "22 Broadway",
    city: "Kingston",
    state: "NY",
    type: "Cidery",
    capacity: 95,
    ageRule: "21+",
  },
  {
    id: "v4",
    name: "East Austin Taproom",
    address: "979 Springdale Rd",
    city: "Austin",
    state: "TX",
    type: "Taproom",
    capacity: 110,
    ageRule: "21+",
  },
  {
    id: "v5",
    name: "Barton Springs Nursery",
    address: "3601 Bee Caves Rd",
    city: "Austin",
    state: "TX",
    type: "Nursery",
    capacity: 70,
    ageRule: "All ages",
  },
  {
    id: "v6",
    name: "Loyal Legion PDX",
    address: "710 SE 6th Ave",
    city: "Portland",
    state: "OR",
    type: "Beer Hall",
    capacity: 130,
    ageRule: "21+",
  },
];

const daysFromNow = (d: number, hour = 19) => {
  const dt = new Date();
  dt.setDate(dt.getDate() + d);
  dt.setHours(hour, 0, 0, 0);
  return dt.toISOString();
};

export const events: BingoEvent[] = [
  {
    id: "e1",
    slug: "social-greenhouse-sidelake-brewing",
    title: "Plant Bingo Night at Sidelake",
    companySlug: "the-social-greenhouse",
    venueId: "v1",
    date: daysFromNow(4),
    doorsOpen: "6:00 PM",
    bingoStart: "7:00 PM",
    price: 30,
    extraCardPrice: 5,
    cardsIncluded: 2,
    ageRule: "21+",
    attire: "Casual",
    foodNote: "Wood-fired pizza + full bar",
    description:
      "Five rounds of plant bingo. Every winner takes home a houseplant — pothos, monstera, calathea and more.",
    capacity: 120,
    ticketsSold: 84,
    featured: true,
  },
  {
    id: "e2",
    slug: "social-greenhouse-bachmans-family",
    title: "Family Bingo at Bachman's",
    companySlug: "the-social-greenhouse",
    venueId: "v2",
    date: daysFromNow(11, 14),
    doorsOpen: "1:30 PM",
    bingoStart: "2:00 PM",
    price: 30,
    extraCardPrice: 3,
    cardsIncluded: 2,
    ageRule: "Family",
    attire: "Casual",
    foodNote: "Coffee bar + snacks on site",
    description:
      "A Saturday afternoon plant bingo perfect for kids and grown-ups. Everyone leaves with a plant.",
    capacity: 80,
    ticketsSold: 41,
  },
  {
    id: "e3",
    slug: "cidersmith-kingston-cider-house",
    title: "Hudson Valley Plant Bingo",
    companySlug: "cidersmith-rep",
    venueId: "v3",
    date: daysFromNow(6),
    doorsOpen: "6:30 PM",
    bingoStart: "7:30 PM",
    price: 30,
    extraCardPrice: 6,
    cardsIncluded: 2,
    ageRule: "21+",
    attire: "Casual",
    foodNote: "Cider flights available",
    description: "Bingo, cider, and rare houseplants sourced from a local grower.",
    capacity: 95,
    ticketsSold: 60,
    featured: true,
  },
  {
    id: "e4",
    slug: "sunroom-east-austin-taproom",
    title: "Weeknight Bingo in East Austin",
    companySlug: "sunroom-social",
    venueId: "v4",
    date: daysFromNow(9),
    doorsOpen: "6:30 PM",
    bingoStart: "7:15 PM",
    price: 30,
    extraCardPrice: 5,
    cardsIncluded: 2,
    ageRule: "21+",
    attire: "Casual",
    foodNote: "Food truck on site",
    description: "Free plant with every ticket, plus bonus prizes for blackout wins.",
    capacity: 110,
    ticketsSold: 55,
  },
  {
    id: "e5",
    slug: "sunroom-barton-springs-nursery",
    title: "Sunday Nursery Bingo",
    companySlug: "sunroom-social",
    venueId: "v5",
    date: daysFromNow(13, 11),
    doorsOpen: "10:30 AM",
    bingoStart: "11:00 AM",
    price: 30,
    extraCardPrice: 4,
    cardsIncluded: 2,
    ageRule: "All ages",
    attire: "Casual",
    foodNote: "Coffee + pastries",
    description: "Morning bingo among the greenery. Bring your kids, bring your grandma.",
    capacity: 70,
    ticketsSold: 30,
    featured: true,
  },
  {
    id: "e6",
    slug: "pnw-loyal-legion",
    title: "Portland Plant Bingo",
    companySlug: "pnw-fern-club",
    venueId: "v6",
    date: daysFromNow(18),
    doorsOpen: "6:00 PM",
    bingoStart: "7:00 PM",
    price: 30,
    extraCardPrice: 5,
    cardsIncluded: 2,
    ageRule: "21+",
    attire: "Casual",
    foodNote: "German sausage menu + 99 taps",
    description: "Beer, brats, bingo — and a fern for every winner.",
    capacity: 130,
    ticketsSold: 44,
  },
];

export function getCompany(slug: string) {
  return companies.find((c) => c.slug === slug);
}

export function getVenue(id: string) {
  return venues.find((v) => v.id === id);
}

export function eventsByCompany(slug: string) {
  return events.filter((e) => e.companySlug === slug);
}

export function getEventById(id: string) {
  return events.find((e) => e.id === id || e.slug === id);
}

export function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
