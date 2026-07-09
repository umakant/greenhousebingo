import { z } from "zod";

export const venueLookupCreateSchema = z.object({
  name: z.string().trim().min(1).max(128),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export const venueLookupUpdateSchema = venueLookupCreateSchema.partial();
