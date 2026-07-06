import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";
import { posProductTenantWhere, requirePosOrgId } from "@/lib/pos-product-scope";
import { listCollectionIdsByProductIds, syncProductCollectionLinks } from "@/lib/pos/sync-product-collections";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "product";
}

function parseInventoryPolicy(raw: unknown): string | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const s = String(raw).toLowerCase();
  if (s === "track" || s === "continue" || s === "deny") return s;
  return undefined;
}

function parseCollectionIds(body: Record<string, unknown>): bigint[] | undefined {
  const raw = body.collectionIds;
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw)) return [];
  const out: bigint[] = [];
  for (const x of raw) {
    try {
      out.push(BigInt(String(x)));
    } catch {
      /* skip */
    }
  }
  return out;
}

function parseJsonArray(raw: unknown): object | undefined {
  if (raw == null || raw === "") return undefined;
  if (Array.isArray(raw) || typeof raw === "object") return raw as object;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p) || (p && typeof p === "object")) return p as object;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function GET() {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const tenant = await posProductTenantWhere();
  const rows = await prisma.posProduct.findMany({
    where: Object.keys(tenant).length ? tenant : undefined,
    include: { category: true, brand: true, unit: true, tax: true },
    orderBy: { name: "asc" },
  });
  const colMap = await listCollectionIdsByProductIds(rows.map((r) => r.id));
  const withCols = rows.map((r) => ({
    ...r,
    collectionIds: colMap.get(r.id.toString()) ?? [],
  }));
  return posOk(ser(withCols));
}

export async function POST(req: NextRequest) {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const orgId = await requirePosOrgId();
  if (!orgId) return posErr("No company context for catalog.", 400);

  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name?.toString().trim()) return posErr("Name is required");
  if (body.price == null) return posErr("Price is required");

  const name = String(body.name).trim();
  const slugRaw = body.slug != null ? String(body.slug).trim() : "";
  const slug = slugify(slugRaw || name);

  const dup = await prisma.posProduct.findFirst({
    where: { organizationId: orgId, slug },
    select: { id: true },
  });
  if (dup) return posErr("A product with this slug already exists for your store.", 400);

  const gallery = parseJsonArray(body.galleryImages);
  const related = parseJsonArray(body.relatedProductIds);
  const variants = parseJsonArray(body.variants);
  const inventoryPolicy = parseInventoryPolicy(body.inventoryPolicy);
  const collectionIds = parseCollectionIds(body);

  const costRaw = body.cost;
  const cost: number | string =
    costRaw != null && costRaw !== ""
      ? typeof costRaw === "number"
        ? costRaw
        : String(costRaw)
      : 0;
  const stock = body.stock != null && body.stock !== "" ? Number(body.stock) : 0;
  const stockAlert = body.stockAlert != null && body.stockAlert !== "" ? Number(body.stockAlert) : 5;

  const data: Prisma.PosProductUncheckedCreateInput = {
    name,
    description: body.description != null ? String(body.description) : null,
    barcode: body.barcode != null ? String(body.barcode) : null,
    sku: body.sku != null ? String(body.sku) : null,
    price: body.price as number | string,
    cost,
    stock,
    stockAlert,
    categoryId: body.categoryId ? BigInt(String(body.categoryId)) : null,
    brandId: body.brandId ? BigInt(String(body.brandId)) : null,
    unitId: body.unitId ? BigInt(String(body.unitId)) : null,
    taxId: body.taxId ? BigInt(String(body.taxId)) : null,
    isActive: Boolean(body.isActive ?? true),
    organizationId: orgId,
    slug,
    compareAtPrice:
      body.compareAtPrice != null && body.compareAtPrice !== ""
        ? (body.compareAtPrice as number | string)
        : null,
    storefrontPublished: Boolean(body.storefrontPublished),
    storefrontSeoTitle: body.storefrontSeoTitle != null ? String(body.storefrontSeoTitle).slice(0, 512) : null,
    storefrontSeoDescription:
      body.storefrontSeoDescription != null ? String(body.storefrontSeoDescription) : null,
    galleryImages: gallery ?? undefined,
    relatedProductIds: related ?? undefined,
    pageTemplateKey: body.pageTemplateKey != null ? String(body.pageTemplateKey) : "product",
    variants: variants ?? undefined,
    image: body.image != null ? String(body.image) : null,
    ...(inventoryPolicy !== undefined ? { inventoryPolicy } : {}),
  };

  const row = await prisma.posProduct.create({
    data,
    include: { category: true, brand: true, unit: true, tax: true },
  });
  if (collectionIds !== undefined) {
    await syncProductCollectionLinks(row.id, orgId, collectionIds);
  }
  const collectionIdsOut = collectionIds?.map((id) => id.toString()) ?? [];
  return posOk(ser({ ...row, collectionIds: collectionIdsOut }), 201);
}
