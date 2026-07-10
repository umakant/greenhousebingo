import { z } from "zod";

import { EVENT_HOST_INVITATION_STATUSES, EVENT_HOST_STATUSES } from "@/lib/event-platform/hosts/host-types";

export const eventHostCreateSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required.").max(255),
  email: z.string().trim().email("Valid email is required.").max(255),
  phone: z.string().trim().max(64).optional().or(z.literal("")),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  status: z.enum(EVENT_HOST_STATUSES).optional(),
});

export const eventHostUpdateSchema = eventHostCreateSchema.partial();

export const eventHostInviteSchema = z.object({
  eventId: z.string().trim().min(1, "Event is required."),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const eventHostInviteRespondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

export type EventHostCreateInput = z.infer<typeof eventHostCreateSchema>;
export type EventHostUpdateInput = z.infer<typeof eventHostUpdateSchema>;
export type EventHostInviteInput = z.infer<typeof eventHostInviteSchema>;

export function isTerminalInvitationStatus(status: string): boolean {
  return (EVENT_HOST_INVITATION_STATUSES as readonly string[]).includes(status) && status !== "pending";
}
