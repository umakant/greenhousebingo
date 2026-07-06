import { NextRequest, NextResponse } from "next/server";

import { guardBrandOwnershipAdmin } from "@/lib/brand-ownership-api-guard";
import { createBrandWithInitialOwner, getBrandOwnershipSummary } from "@/lib/brand-ownership-service";
import { ensureManageBrandOwnershipPermission } from "@/lib/brand-ownership-role";
import { parseDate, toIsoDateString } from "@/lib/format-date";
import { resolveMediaUrlMap, resolveStoredMediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

async function currentUserId(req: NextRequest): Promise<bigint | null> {
  const raw = req.cookies.get("pf_user_id")?.value;
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;

  const params = new URL(req.url).searchParams;
  const search = params.get("search")?.trim().toLowerCase() ?? "";
  const status = params.get("status")?.trim().toLowerCase() ?? "all";
  const dateFrom = params.get("dateFrom")?.trim() ?? "";
  const dateTo = params.get("dateTo")?.trim() ?? "";

  const where: { status?: string } = {};
  if (status && status !== "all") {
    where.status = status;
  }

  const brands = await prisma.ownershipBrand.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      holders: { where: { status: "active" } },
    },
  });

  const items = await Promise.all(
    brands.map(async (b) => {
      const summary = await getBrandOwnershipSummary(b.id);
      return {
        id: b.id.toString(),
        name: b.name,
        firstName: b.firstName,
        lastName: b.lastName,
        slug: b.slug,
        logo: b.logo,
        status: b.status,
        notes: b.notes,
        totalOwnership: summary?.totalOwnership ?? 0,
        availableOwnership: summary?.availableOwnership ?? 100,
        protectedOwnership: summary?.protectedOwnership ?? 0,
        partnerCount: summary?.partnerCount ?? 0,
        holderCount: b.holders?.length ?? 0,
        createdAt: b.createdAt.toISOString(),
      };
    }),
  );

  const logoMap = await resolveMediaUrlMap(items.map((item) => item.logo));
  let resolvedItems = items.map((item) => ({
    ...item,
    logo: resolveStoredMediaUrl(item.logo, logoMap),
  }));

  if (search) {
    resolvedItems = resolvedItems.filter(
      (i) =>
        i.name.toLowerCase().includes(search) ||
        (i.slug?.toLowerCase().includes(search) ?? false),
    );
  }

  if (dateFrom || dateTo) {
    resolvedItems = resolvedItems.filter((i) => {
      const d = parseDate(i.createdAt);
      if (!d) return false;
      const iso = toIsoDateString(d);
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    });
  }

  return NextResponse.json({ ok: true, items: resolvedItems });
}

export async function POST(req: NextRequest) {
  const denied = await guardBrandOwnershipAdmin(req);
  if (denied) return denied;
  await ensureManageBrandOwnershipPermission();

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, message: "Brand name is required." }, { status: 400 });
  }

  const initialOwnerName =
    String(body?.initialOwnerName ?? "").trim() || `${name} Holdings`;

  try {
    const brand = await createBrandWithInitialOwner({
      name,
      firstName: body?.firstName != null ? String(body.firstName).trim() || null : null,
      lastName: body?.lastName != null ? String(body.lastName).trim() || null : null,
      logo: body?.logo ?? null,
      status: body?.status ?? "active",
      notes: body?.notes ?? null,
      initialOwnerName,
      initialOwnershipPercent: Number(body?.initialOwnershipPercent ?? 100),
      initialMinimumOwnershipPercent: Number(body?.initialMinimumOwnershipPercent ?? 100),
      changedByUserId: await currentUserId(req),
    });

    const summary = await getBrandOwnershipSummary(brand.id);
    return NextResponse.json({ ok: true, brand: { id: brand.id.toString(), name: brand.name }, summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create brand.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
