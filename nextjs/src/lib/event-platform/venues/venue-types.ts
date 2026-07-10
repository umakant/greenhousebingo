export const EVENT_VENUE_STATUSES = ["active", "inactive", "archived"] as const;

export type EventVenueStatus = (typeof EVENT_VENUE_STATUSES)[number];

export const VENUE_WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type VenueWeekday = (typeof VENUE_WEEKDAYS)[number];

export type VenueBusinessHours = Partial<Record<VenueWeekday, string>>;

export type VenueLookupDto = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type EventVenueDto = {
  id: string;
  organizationId: string;
  name: string;
  imageUrl: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: string | null;
  longitude: string | null;
  category: string | null;
  venueType: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  seating: number | null;
  age21Plus: boolean;
  drinksAlcohol: boolean;
  food: boolean;
  businessHours: VenueBusinessHours | null;
  status: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type EventVenuesListPayload = {
  items: EventVenueDto[];
};
