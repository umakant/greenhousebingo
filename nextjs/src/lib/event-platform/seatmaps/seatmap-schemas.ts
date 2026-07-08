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

export const seatmapCanvasSchema = z.object({
  shape: z.enum(["rectangle", "fan_arena", "semi_circle", "custom"]).default("rectangle"),
  width: z.number().int().min(800).max(2000).default(1200),
  height: z.number().int().min(800).max(2000).default(800),
  orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
  defaultStagePosition: z.boolean().default(true),
  rowSeatLabels: z.boolean().default(false),
});

export const seatmapLayoutMetaSchema = z.object({
  category: z.string().min(1),
  mapType: z.string().min(1),
  canvas: seatmapCanvasSchema,
});

export const seatmapLayoutSchema = z.object({
  sections: z.array(seatmapSectionSchema).default([]),
  tiers: z.array(seatmapTierSchema).default([]),
  meta: seatmapLayoutMetaSchema.optional(),
});

export type SeatmapLayout = z.infer<typeof seatmapLayoutSchema>;
export type SeatmapCanvas = z.infer<typeof seatmapCanvasSchema>;
export type SeatmapLayoutMeta = z.infer<typeof seatmapLayoutMetaSchema>;
export type SeatmapTier = z.infer<typeof seatmapTierSchema>;

export const EMPTY_SEATMAP_LAYOUT: SeatmapLayout = { sections: [], tiers: [] };

export const seatmapCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(250).optional(),
  status: z.enum(["active", "draft", "archived"]).optional(),
  layout: seatmapLayoutSchema.optional(),
});

export const seatmapUpdateSchema = seatmapCreateSchema.partial();
