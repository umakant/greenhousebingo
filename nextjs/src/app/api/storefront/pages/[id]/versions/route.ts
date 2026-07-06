import { NextRequest, NextResponse } from "next/server";

import { jsonSafe } from "@/lib/json-serialize";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { listPageVersions } from "@/lib/storefront/services/page-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const { id } = await ctx.params;
  let pageId: bigint;
  try {
    pageId = BigInt(id);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid page id." }, { status: 400 });
  }

  const rows = await listPageVersions(org.organizationId, pageId);
  return NextResponse.json(
    jsonSafe({
      ok: true,
      data: rows.map((r) => ({
        ...r,
        id: r.id.toString(),
        publishedAt: r.publishedAt instanceof Date ? r.publishedAt.toISOString() : r.publishedAt,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      })),
    }),
  );
}
