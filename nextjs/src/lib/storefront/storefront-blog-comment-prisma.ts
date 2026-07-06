import { prisma } from "@/lib/prisma";

export const STOREFRONT_BLOG_COMMENT_PRISMA_SETUP_MESSAGE =
  "Blog comments require an up-to-date database. Run `npx prisma migrate deploy` and `npx prisma generate`, then restart the server.";

/** Safe access when Prisma client predates `StorefrontBlogComment`. */
export function getStorefrontBlogCommentDelegate(): typeof prisma.storefrontBlogComment | null {
  if (!("storefrontBlogComment" in prisma)) return null;
  const d = (prisma as unknown as { storefrontBlogComment?: typeof prisma.storefrontBlogComment })
    .storefrontBlogComment;
  return d && typeof d.findMany === "function" ? d : null;
}
