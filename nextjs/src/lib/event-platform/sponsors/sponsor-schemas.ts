import { z } from "zod";

import { EVENT_SPONSOR_STATUSES } from "@/lib/event-platform/sponsors/sponsor-types";

export const eventSponsorCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255),
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
