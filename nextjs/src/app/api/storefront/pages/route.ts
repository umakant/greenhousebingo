import { NextRequest, NextResponse } from "next/server";

import { jsonSafe } from "@/lib/json-serialize";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { createPageWithDraft, listPagesForWebsite } from "@/lib/storefront/services/page-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const wid = req.nextUrl.searchParams.get("websiteId");
  if (!wid || !/^\d+$/.test(wid)) {
    return NextResponse.json({ ok: false, message: "websiteId query required." }, { status: 400 });
  }
  let websiteId: bigint;
  try {
    websiteId = BigInt(wid);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid websiteId." }, { status: 400 });
  }

  const rows = await listPagesForWebsite(org.organizationId, websiteId);
  return NextResponse.json(
    jsonSafe({
      ok: true,
      data: rows.map((p) => ({
        ...p,
        id: p.id.toString(),
        _count: p._count,
      })),
    }),
  );
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.PAGE_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as {
    websiteId?: string;
    slug?: string;
    title?: string;
    pageType?: string;
  };
  let websiteId: bigint;
  try {
    websiteId = BigInt(String(body.websiteId ?? ""));
  } catch {
    return NextResponse.json({ ok: false, message: "websiteId required." }, { status: 400 });
  }
  const slug = String(body.slug ?? "").trim();
  const title = String(body.title ?? "").trim();
  if (!slug || !title) {
    return NextResponse.json({ ok: false, message: "slug and title required." }, { status: 400 });
  }

  try {
    const page = await createPageWithDraft(
      org.organizationId,
      websiteId,
      { slug, title, pageType: body.pageType },
      org.userId,
      { ...saasActorFromRequest(req) },
    );
    return NextResponse.json(jsonSafe({ ok: true, data: { ...page, id: page.id.toString() } }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Create failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
