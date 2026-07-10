import { z } from "zod";

import { EVENT_SPONSOR_STATUSES } from "@/lib/event-platform/sponsors/sponsor-types";

export const eventSponsorCreateSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(128),
  lastName: z.string().trim().min(1, "Last name is required.").max(128),
  company: z.string().trim().max(255).optional().or(z.literal("")),
  address: z.string().trim().max(512).optional().or(z.literal("")),
  phone: z.string().trim().max(64).optional().or(z.literal("")),
  perk: z.string().trim().max(5000).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  website: z.string().trim().max(512).optional().or(z.literal("")),
  status: z.enum(EVENT_SPONSOR_STATUSES).optional(),
});

export const eventSponsorUpdateSchema = eventSponsorCreateSchema.partial();

export type EventSponsorCreateInput = z.infer<typeof eventSponsorCreateSchema>;
export type EventSponsorUpdateInput = z.infer<typeof eventSponsorUpdateSchema>;
