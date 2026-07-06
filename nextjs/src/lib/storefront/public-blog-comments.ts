import "server-only";

import {
  getStorefrontBlogCommentDelegate,
  STOREFRONT_BLOG_COMMENT_PRISMA_SETUP_MESSAGE,
} from "@/lib/storefront/storefront-blog-comment-prisma";
import { getStorefrontBlogPostDelegate } from "@/lib/storefront/storefront-blog-post-prisma";
import { publicBlogPublishedWhere } from "@/lib/storefront/public-catalog";

export type PublicBlogCommentApproved = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type MerchantBlogCommentRow = PublicBlogCommentApproved & {
  status: string;
};

function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Approved comments for a published post (newest first). */
export async function listApprovedBlogCommentsForPublicPost(
  organizationId: bigint,
  postSlug: string,
): Promise<{ ok: true; comments: PublicBlogCommentApproved[] } | { ok: false; error: string }> {
  const blog = getStorefrontBlogPostDelegate();
  const comments = getStorefrontBlogCommentDelegate();
  if (!blog || !comments) {
    return { ok: false, error: STOREFRONT_BLOG_COMMENT_PRISMA_SETUP_MESSAGE };
  }
  const slug = normalizeSlug(postSlug);
  if (!slug) return { ok: true, comments: [] };

  const post = await blog.findFirst({
    where: { ...publicBlogPublishedWhere(organizationId), slug: { equals: slug, mode: "insensitive" } },
    select: { id: true },
  });
  if (!post) return { ok: true, comments: [] };

  const rows = await comments.findMany({
    where: { blogPostId: post.id, status: { equals: "approved", mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, authorName: true, body: true, createdAt: true },
    take: 200,
  });

  return {
    ok: true,
    comments: rows.map((r) => ({
      id: r.id.toString(),
      authorName: r.authorName.trim(),
      body: r.body,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "");
}

function normalizeAuthorName(s: string): string {
  return stripTags(s).replace(/\s+/g, " ").trim().slice(0, 160);
}

/** Creates a pending comment on a published post. */
export async function createPendingBlogComment(opts: {
  organizationId: bigint;
  postSlug: string;
  authorName: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const blog = getStorefrontBlogPostDelegate();
  const comments = getStorefrontBlogCommentDelegate();
  if (!blog || !comments) {
    return { ok: false, error: STOREFRONT_BLOG_COMMENT_PRISMA_SETUP_MESSAGE, status: 503 };
  }

  const authorName = normalizeAuthorName(opts.authorName);
  const body = stripTags(opts.body).trim().slice(0, 4000);
  if (authorName.length < 1 || authorName.length > 160) {
    return { ok: false, error: "Please enter your name (1–160 characters).", status: 400 };
  }
  if (body.length < 1 || body.length > 4000) {
    return { ok: false, error: "Please enter a comment (1–4000 characters).", status: 400 };
  }

  const slug = normalizeSlug(opts.postSlug);
  if (!slug) return { ok: false, error: "Invalid post.", status: 400 };

  const post = await blog.findFirst({
    where: { ...publicBlogPublishedWhere(opts.organizationId), slug: { equals: slug, mode: "insensitive" } },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "This post is not available for comments.", status: 404 };

  await comments.create({
    data: {
      blogPostId: post.id,
      authorName,
      body,
      status: "pending",
    },
  });

  return { ok: true };
}

/** All comments for a post (merchant); includes pending. */
export async function listBlogCommentsForMerchantPost(opts: {
  organizationId: bigint;
  postId: bigint;
}): Promise<{ ok: true; comments: MerchantBlogCommentRow[] } | { ok: false; error: string }> {
  const blog = getStorefrontBlogPostDelegate();
  const comments = getStorefrontBlogCommentDelegate();
  if (!blog || !comments) {
    return { ok: false, error: STOREFRONT_BLOG_COMMENT_PRISMA_SETUP_MESSAGE };
  }

  const post = await blog.findFirst({
    where: { id: opts.postId, organizationId: opts.organizationId },
    select: { id: true },
  });
  if (!post) return { ok: false, error: "Post not found." };

  const rows = await comments.findMany({
    where: { blogPostId: post.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, authorName: true, body: true, status: true, createdAt: true },
    take: 500,
  });

  return {
    ok: true,
    comments: rows.map((r) => ({
      id: r.id.toString(),
      authorName: r.authorName.trim(),
      body: r.body,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function updateBlogCommentStatusForMerchant(opts: {
  organizationId: bigint;
  commentId: bigint;
  status: "approved" | "rejected" | "spam";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const comments = getStorefrontBlogCommentDelegate();
  if (!comments) {
    return { ok: false, error: STOREFRONT_BLOG_COMMENT_PRISMA_SETUP_MESSAGE };
  }

  const row = await comments.findFirst({
    where: { id: opts.commentId },
    include: { blogPost: { select: { organizationId: true } } },
  });
  if (!row || row.blogPost.organizationId !== opts.organizationId) {
    return { ok: false, error: "Comment not found." };
  }

  await comments.update({
    where: { id: opts.commentId },
    data: { status: opts.status },
  });

  return { ok: true };
}
