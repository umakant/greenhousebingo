import { z } from "zod";

export const eventCustomPageCreateSchema = z.object({
  title: z.string().min(1, "Title is required.").max(512),
  slug: z.string().max(160).optional(),
  contentHtml: z.string().max(500_000).optional().nullable(),
  seoTitle: z.string().max(512).optional().nullable(),
  seoDescription: z.string().max(2000).optional().nullable(),
  featuredImage: z.string().max(2048).optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export const eventCustomPageUpdateSchema = eventCustomPageCreateSchema.partial();

export function slugifyPageTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}
