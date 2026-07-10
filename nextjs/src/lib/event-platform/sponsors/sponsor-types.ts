export const EVENT_SPONSOR_STATUSES = ["active", "archived"] as const;
export type EventSponsorStatus = (typeof EVENT_SPONSOR_STATUSES)[number];

export type EventSponsorDto = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  perk: string | null;
  imageUrl: string | null;
  website: string | null;
  status: EventSponsorStatus;
  createdAt: string;
  updatedAt: string | null;
};

export type EventSponsorsListPayload = {
  items: EventSponsorDto[];
};
