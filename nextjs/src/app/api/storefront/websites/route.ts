import { NextRequest, NextResponse } from "next/server";

import { jsonSafe } from "@/lib/json-serialize";
import { assertStorefrontApiAccess } from "@/lib/storefront-access";
import { requireStorefrontOrganization, saasActorFromRequest } from "@/lib/storefront/api-org";
import { STOREFRONT_PERMISSION } from "@/lib/storefront-permissions";
import { createWebsite, listWebsitesForOrganization } from "@/lib/storefront/services/website-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await assertStorefrontApiAccess(req, { permission: STOREFRONT_PERMISSION.VIEW });
  if (denied) return denied;
  const org = await requireStorefrontOrganization(req);
  if (!org.ok) return org.response;

  const rows = await listWebsitesForOrganization(org.organizationId);
  return NextResponse.json(
    jsonSafe({
      ok: true,
      data: rows.map((w) => ({
        id: w.id.toString(),
        name: w.name,
        slug: w.slug,
        status: w.status,
        defaultLocale: w.defaultLocale,
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
    name?: string;
    slug?: string;
    status?: string;
    defaultLocale?: string;
  };
  const name = String(body.name ?? "").trim();
  const slug = String(body.slug ?? "").trim();
  if (!name || !slug) {
    return NextResponse.json({ ok: false, message: "Name and slug are required." }, { status: 400 });
  }

  try {
    const w = await createWebsite(
      org.organizationId,
      { name, slug, status: body.status, defaultLocale: body.defaultLocale },
      org.userId,
      { ...saasActorFromRequest(req) },
    );
    return NextResponse.json(
      jsonSafe({
        ok: true,
        data: {
          id: w.id.toString(),
          name: w.name,
          slug: w.slug,
          status: w.status,
          defaultLocale: w.defaultLocale,
        },
      }),
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Create failed.";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
