import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import {
  buildModuleCode,
  enrichModuleWithCatalog,
  findCategoryForModuleName,
  nextModuleSequence,
  resolveModuleCategoryId,
} from "@/lib/industry-module-codes";
import { normalizeIndustryModuleName } from "@/lib/industry-modules-catalog";


export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-modules") && !hasPermission(perms, "manage-users") && !hasPermission(perms, "create-users")) {
    // In Laravel this list appears in company creation for superadmin.
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const all = (new URL(req.url)).searchParams.get("all") === "1";

  const rows = await prisma.businessModule.findMany({
    ...(all ? {} : { where: { isActive: true } }),
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      features: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, title: true, description: true, sortOrder: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    items: rows.map((m) => {
      const enriched = enrichModuleWithCatalog({
        name: m.name,
        code: m.code,
      });
      return {
        id: m.id.toString(),
        code: m.code,
        name: m.name,
        description: m.description,
        isActive: m.isActive,
        sortOrder: m.sortOrder,
        categoryId: enriched.categoryId,
        categoryTitle: enriched.categoryTitle,
        categoryCode: enriched.categoryCode,
        moduleCode: enriched.moduleCode,
        features: (m.features ?? []).map((f) => ({
          id: f.id.toString(),
          title: f.title,
          description: f.description,
          sortOrder: f.sortOrder,
        })),
        createdAt: m.createdAt?.toISOString?.() ?? null,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-modules")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const categoryId = String(body?.category_id ?? "").trim();
  const isActive = body?.is_active == null ? true : Boolean(body?.is_active);
  const sortOrder = Number.isFinite(Number(body?.sort_order)) ? Number(body?.sort_order) : 0;
  const features = Array.isArray(body?.features) ? (body.features as any[]) : [];
  if (!name) return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });

  if (categoryId) {
    const category = findCategoryForModuleName(name);
    if (category && category.id !== categoryId) {
      return NextResponse.json(
        { ok: false, message: "Selected sub-category does not belong to the chosen category." },
        { status: 400 },
      );
    }
    if (category) {
      const inCatalog = category.moduleNames.some(
        (n) => normalizeIndustryModuleName(n) === normalizeIndustryModuleName(name),
      );
      if (!inCatalog) {
        return NextResponse.json(
          { ok: false, message: "Selected sub-category is not listed under the chosen category." },
          { status: 400 },
        );
      }
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const agg = await tx.businessModule.aggregate({ _max: { id: true } });
    const id = (agg._max.id ?? 0n) + 1n;
    const existing = await tx.businessModule.findMany({ select: { name: true, code: true } });
    const resolvedCategoryId = categoryId || resolveModuleCategoryId(name);
    const sequence = nextModuleSequence(name, resolvedCategoryId, existing);
    const code = buildModuleCode(name, sequence);

    const mod = await tx.businessModule.create({
      data: {
        id,
        code,
        name,
        description: description || null,
        isActive,
        sortOrder,
        createdAt: new Date(),
      },
      select: { id: true, code: true },
    });

    if (features.length > 0) {
      const fAgg = await tx.businessModuleFeature.aggregate({ _max: { id: true } });
      let nextId = (fAgg._max.id ?? 0n) + 1n;
      for (let i = 0; i < features.length; i++) {
        const f = features[i] ?? {};
        const title = String(f?.title ?? "").trim();
        if (!title) continue;
        const fDesc = String(f?.description ?? "").trim();
        await tx.businessModuleFeature.create({
          data: {
            id: nextId,
            businessModuleId: id,
            title,
            description: fDesc || null,
            sortOrder: i,
            createdAt: new Date(),
          },
        });
        nextId += 1n;
      }
    }

    return mod;
  });

  const enriched = enrichModuleWithCatalog({ name, code: created.code }, categoryId || undefined);

  return NextResponse.json(
    {
      ok: true,
      id: created.id.toString(),
      code: created.code,
      categoryId: enriched.categoryId,
      categoryCode: enriched.categoryCode,
      moduleCode: enriched.moduleCode,
    },
    { status: 201 },
  );
}

