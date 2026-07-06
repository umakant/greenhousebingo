import { z } from "zod";

export const menuCreateSchema = z.object({
  name: z.string().min(1).max(255),
  location: z.enum(["header", "footer", "sidebar", "mobile"]).default("header"),
  isActive: z.boolean().optional(),
});

export const menuUpdateSchema = menuCreateSchema.partial();

export const menuItemCreateSchema = z.object({
  label: z.string().min(1).max(255),
  itemType: z.enum(["url", "page"]).default("url"),
  pageId: z.string().optional(),
  url: z.string().max(2048).optional(),
  target: z.enum(["_self", "_blank"]).default("_self"),
  parentId: z.string().optional(),
  isEnabled: z.boolean().optional(),
});

export const menuItemUpdateSchema = menuItemCreateSchema.partial();

export const menuItemsReorderSchema = z.object({
  itemIds: z.array(z.string().min(1)),
});
