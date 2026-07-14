import { z } from "zod";

import {
  EVENT_PLANT_CARE_LEVELS,
  EVENT_PLANT_CATALOG_STATUSES,
} from "@/lib/event-platform/plant-catalog/plant-catalog-types";

export const eventPlantCatalogCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(255),
  scientificName: z.string().trim().max(255).optional().or(z.literal("")),
  category: z.string().trim().max(128).optional().or(z.literal("")),
  careLevel: z.enum(EVENT_PLANT_CARE_LEVELS).default("Easy"),
  light: z.string().trim().max(255).optional().or(z.literal("")),
  water: z.string().trim().max(255).optional().or(z.literal("")),
  petSafe: z.coerce.boolean().optional(),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  imageUrl: z.string().trim().max(2048).optional().or(z.literal("")),
  retailValue: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  status: z.enum(EVENT_PLANT_CATALOG_STATUSES).optional(),
});

export const eventPlantCatalogUpdateSchema = eventPlantCatalogCreateSchema.partial();

export const plantAiGenerateSchema = z.object({
  name: z.string().trim().min(1, "Plant name is required.").max(255),
});

export type EventPlantCatalogCreateInput = z.infer<typeof eventPlantCatalogCreateSchema>;
export type EventPlantCatalogUpdateInput = z.infer<typeof eventPlantCatalogUpdateSchema>;
