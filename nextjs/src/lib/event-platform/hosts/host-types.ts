export const EVENT_HOST_STATUSES = ["active", "archived"] as const;
export type EventHostStatus = (typeof EVENT_HOST_STATUSES)[number];

export const EVENT_HOST_INVITATION_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "expired",
  "revoked",
] as const;
export type EventHostInvitationStatus = (typeof EVENT_HOST_INVITATION_STATUSES)[number];

export type EventHostDto = {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  imageUrl: string | null;
  status: EventHostStatus;
  linkedUserId: string | null;
  pendingInvites: number;
  acceptedInvites: number;
  createdAt: string;
  updatedAt: string | null;
};

export type EventHostInvitationDto = {
  id: string;
  hostId: string;
  hostName: string;
  hostEmail: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  status: EventHostInvitationStatus;
  message: string | null;
  inviteToken: string;
  inviteUrl: string;
  respondedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type EventHostsListPayload = {
  items: EventHostDto[];
  invitations: EventHostInvitationDto[];
};

export type PublicHostInvitePayload = {
  hostName: string;
  eventTitle: string;
  eventStartsAt: string;
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
  message: string | null;
  organizationName: string | null;
  status: EventHostInvitationStatus;
  expiresAt: string | null;
};
