import { NextRequest, NextResponse } from "next/server";

import {
  createPendingBlogComment,
  listApprovedBlogCommentsForPublicPost,
} from "@/lib/storefront/public-blog-comments";
import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const ctx = await getPublicStorefrontContextFromHost(host);
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Store not found for this host" }, { status: 404 });
    }

    const postSlug = req.nextUrl.searchParams.get("postSlug")?.trim() ?? "";
    const result = await listApprovedBlogCommentsForPublicPost(ctx.organizationId, postSlug);
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error }, { status: 503 });
    }
    return NextResponse.json({ ok: true, comments: result.comments });
  } catch (e) {
    console.error("[storefront/public/blog-comments] GET failed:", e);
    const message = e instanceof Error ? e.message : "Failed to load comments.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const ctx = await getPublicStorefrontContextFromHost(host);
    if (!ctx) {
      return NextResponse.json({ ok: false, error: "Store not found for this host" }, { status: 404 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.website != null && String(body.website).trim() !== "") {
      return new NextResponse(null, { status: 204 });
    }

    const postSlug = String(body.postSlug ?? "").trim();
    const authorName = String(body.authorName ?? "");
    const text = String(body.body ?? "");

    const result = await createPendingBlogComment({
      organizationId: ctx.organizationId,
      postSlug,
      authorName,
      body: text,
    });
    if (!result.ok) {
      return NextResponse.json({ ok: false, message: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json({
      ok: true,
      message: "Thanks! Your comment was submitted and will appear after the store reviews it.",
    });
  } catch (e) {
    console.error("[storefront/public/blog-comments] POST failed:", e);
    const message = e instanceof Error ? e.message : "Failed to submit comment.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
