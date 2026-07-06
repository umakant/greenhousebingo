import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { updateBlogCommentStatusForMerchant } from "@/lib/storefront/public-blog-comments";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.PAGE_MANAGE,
    requireMutation: true,
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let commentId: bigint;
  try {
    commentId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid comment id." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const raw = String(body.status ?? "").toLowerCase();
  const status = raw === "approved" || raw === "rejected" || raw === "spam" ? raw : null;
  if (!status) {
    return NextResponse.json({ ok: false, message: "status must be approved, rejected, or spam." }, { status: 400 });
  }

  const result = await updateBlogCommentStatusForMerchant({
    organizationId: org.organizationId,
    commentId,
    status,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
