import { NextRequest, NextResponse } from "next/server";

import { jsonSafe } from "@/lib/json-serialize";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { ensureDraftPageVersion } from "@/lib/storefront/services/page-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.PAGE_MANAGE });
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

  try {
    const draft = await ensureDraftPageVersion(org.organizationId, pageId, org.userId, {
      ...saasActorFromRequest(req),
    });
    return NextResponse.json(
      jsonSafe({
        ok: true,
        data: {
          draftVersion: {
            ...draft,
            id: draft.id.toString(),
            pageId: draft.pageId.toString(),
            sections: draft.sections.map((s) => ({
              ...s,
              id: s.id.toString(),
              pageVersionId: s.pageVersionId.toString(),
              blocks: s.blocks.map((b) => ({
                ...b,
                id: b.id.toString(),
                sectionInstanceId: b.sectionInstanceId.toString(),
              })),
            })),
          },
        },
      }),
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create draft.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
