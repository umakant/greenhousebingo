import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { listBlogCommentsForMerchantPost } from "@/lib/storefront/public-blog-comments";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: [STOREFRONT_PERMISSION.PAGE_MANAGE, STOREFRONT_PERMISSION.PUBLISH, STOREFRONT_PERMISSION.VIEW],
  });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let postId: bigint;
  try {
    postId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid post id." }, { status: 400 });
  }

  const result = await listBlogCommentsForMerchantPost({
    organizationId: org.organizationId,
    postId,
  });
  if (!result.ok) {
    const setup = /migrate|prisma generate|unavailable/i.test(result.error);
    return NextResponse.json({ ok: false, message: result.error }, { status: setup ? 503 : 404 });
  }
  return NextResponse.json({ ok: true, comments: result.comments });
}
