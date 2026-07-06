import { prisma } from "@/lib/prisma";

/** Shown when the running server’s Prisma client predates `StorefrontBlogPost` or the DB migration is missing. */
export const STOREFRONT_BLOG_PRISMA_SETUP_MESSAGE =
  "Blog storage is unavailable. Stop the dev server, run `npx prisma generate` and `npx prisma migrate deploy`, then start again.";

/** Safe access: stale builds omit `storefrontBlogPost` until `prisma generate` is run. */
export function getStorefrontBlogPostDelegate(): typeof prisma.storefrontBlogPost | null {
  if (!("storefrontBlogPost" in prisma)) return null;
  const d = (prisma as unknown as { storefrontBlogPost?: typeof prisma.storefrontBlogPost }).storefrontBlogPost;
  return d && typeof d.findMany === "function" ? d : null;
}
