import { NextRequest, NextResponse } from "next/server";

import { jsonSafe } from "@/lib/json-serialize";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { createDomainForWebsite, listDomainsForWebsite } from "@/lib/storefront/services/domain-service";

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

  const rows = await listDomainsForWebsite(org.organizationId, websiteId);
  return NextResponse.json(
    jsonSafe({
      ok: true,
      data: rows.map((d) => ({
        id: d.id.toString(),
        hostname: d.hostname,
        status: d.status,
        isPrimary: d.isPrimary,
        verifiedAt: d.verifiedAt instanceof Date ? d.verifiedAt.toISOString() : d.verifiedAt,
        updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
      })),
    }),
  );
}

export async function POST(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.WEBSITE_MANAGE });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const body = (await req.json().catch(() => ({}))) as {
    websiteId?: string;
    hostname?: string;
    isPrimary?: boolean;
    status?: string;
  };
  let websiteId: bigint;
  try {
    websiteId = BigInt(String(body.websiteId ?? ""));
  } catch {
    return NextResponse.json({ ok: false, message: "websiteId required." }, { status: 400 });
  }
  const hostname = String(body.hostname ?? "").trim();
  if (!hostname) {
    return NextResponse.json({ ok: false, message: "hostname required." }, { status: 400 });
  }

  try {
    const d = await createDomainForWebsite(
      org.organizationId,
      websiteId,
      { hostname, isPrimary: body.isPrimary, status: body.status },
      org.userId,
      { ...saasActorFromRequest(req) },
    );
    return NextResponse.json(
      jsonSafe({
        ok: true,
        data: {
          id: d.id.toString(),
          websiteId: d.websiteId.toString(),
          hostname: d.hostname,
          status: d.status,
          isPrimary: d.isPrimary,
        },
      }),
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
