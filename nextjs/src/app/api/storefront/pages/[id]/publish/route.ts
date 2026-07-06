import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { publishPageVersion } from "@/lib/storefront/services/page-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.PUBLISH });
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

  const body = (await req.json().catch(() => ({}))) as { versionId?: string; rollback?: boolean };
  let versionId: bigint;
  try {
    versionId = BigInt(String(body.versionId ?? ""));
  } catch {
    return NextResponse.json({ ok: false, message: "versionId required." }, { status: 400 });
  }

  try {
    await publishPageVersion(org.organizationId, pageId, versionId, org.userId, {
      rollback: body.rollback === true,
      saas: { ...saasActorFromRequest(req) },
    });
    try {
      revalidatePath("/shop");
    } catch {
      /* ignore */
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Publish failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
