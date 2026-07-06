import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { STOREFRONT_MEDIA_TAGS } from "@/lib/storefront/media-tags";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";

export const dynamic = "force-dynamic";

/** Day 9 — Supported storefront media grouping tags (use with Media `custom_properties`). */
export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, {
    permission: STOREFRONT_PERMISSION.VIEW,
  });
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    data: {
      tags: [...STOREFRONT_MEDIA_TAGS],
      hint: "Store under custom_properties.storefrontTags: string[] on Media rows, or storefrontTag on upload body when supported.",
    },
  });
}
