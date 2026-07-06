import { z } from "zod";

export const seatmapSeatSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["available", "held", "sold", "blocked"]).default("available"),
  tierId: z.string().optional(),
});

export const seatmapRowSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  seats: z.array(seatmapSeatSchema).default([]),
});

export const seatmapSectionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  tierId: z.string().optional(),
  rows: z.array(seatmapRowSchema).default([]),
});

export const seatmapTierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative().default(0),
  color: z.string().optional(),
});

export const seatmapLayoutSchema = z.object({
  sections: z.array(seatmapSectionSchema).default([]),
  tiers: z.array(seatmapTierSchema).default([]),
});

export type SeatmapLayout = z.infer<typeof seatmapLayoutSchema>;

export const EMPTY_SEATMAP_LAYOUT: SeatmapLayout = { sections: [], tiers: [] };

export const seatmapCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(4000).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  layout: seatmapLayoutSchema.optional(),
});

export const seatmapUpdateSchema = seatmapCreateSchema.partial();
