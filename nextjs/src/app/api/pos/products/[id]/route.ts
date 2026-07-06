import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";
import { posProductTenantWhere } from "@/lib/pos-product-scope";
import { listCollectionIdsForProduct, syncProductCollectionLinks } from "@/lib/pos/sync-product-collections";

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
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return "track";
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

function parseJsonArray(raw: unknown): object | null | undefined {
  if (raw === undefined) return undefined;
  if (raw == null || raw === "") return null;
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

async function assertProductAccess(id: bigint): Promise<{ ok: true } | { ok: false; response: ReturnType<typeof posErr> }> {
  const tenant = await posProductTenantWhere();
  const row = await prisma.posProduct.findUnique({ where: { id }, select: { organizationId: true } });
  if (!row) return { ok: false, response: posErr("Not found", 404) };
  if ("organizationId" in tenant && tenant.organizationId != null) {
    if (row.organizationId !== tenant.organizationId) {
      return { ok: false, response: posErr("Not found", 404) };
    }
  }
  return { ok: true };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const { id } = await params;
  let bid: bigint;
  try {
    bid = BigInt(id);
  } catch {
    return posErr("Invalid id", 400);
  }
  const gate = await assertProductAccess(bid);
  if (!gate.ok) return gate.response;

  const row = await prisma.posProduct.findUnique({
    where: { id: bid },
    include: { category: true, brand: true, unit: true, tax: true },
  });
  if (!row) return posErr("Not found", 404);
  const collectionIds = await listCollectionIdsForProduct(bid);
  return posOk(ser({ ...row, collectionIds }));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const { id } = await params;
  let bid: bigint;
  try {
    bid = BigInt(id);
  } catch {
    return posErr("Invalid id", 400);
  }
  const gate = await assertProductAccess(bid);
  if (!gate.ok) return gate.response;

  const body = (await req.json()) as Record<string, unknown>;
  const existingRow = await prisma.posProduct.findUnique({
    where: { id: bid },
    select: { organizationId: true },
  });

  let slug: string | undefined;
  if (body.slug !== undefined) {
    const base = String(body.slug).trim();
    slug = slugify(base || String(body.name ?? "product"));
    if (existingRow?.organizationId) {
      const dup = await prisma.posProduct.findFirst({
        where: { organizationId: existingRow.organizationId, slug, NOT: { id: bid } },
        select: { id: true },
      });
      if (dup) return posErr("A product with this slug already exists for your store.", 400);
    }
  }

  const gallery = parseJsonArray(body.galleryImages);
  const related = parseJsonArray(body.relatedProductIds);
  const variants = parseJsonArray(body.variants);
  const inventoryPolicy = parseInventoryPolicy(body.inventoryPolicy);
  const collectionIds = parseCollectionIds(body);

  const data: Prisma.PosProductUncheckedUpdateInput = {
    ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
    ...(body.description !== undefined ? { description: body.description != null ? String(body.description) : null } : {}),
    ...(body.barcode !== undefined ? { barcode: body.barcode != null ? String(body.barcode) : null } : {}),
    ...(body.sku !== undefined ? { sku: body.sku != null ? String(body.sku) : null } : {}),
    ...(body.price !== undefined ? { price: body.price as number | string } : {}),
    ...(body.cost !== undefined ? { cost: body.cost as number | string } : {}),
    ...(body.stock !== undefined ? { stock: Number(body.stock) } : {}),
    ...(body.stockAlert !== undefined ? { stockAlert: Number(body.stockAlert) } : {}),
    ...(body.categoryId !== undefined
      ? { categoryId: body.categoryId ? BigInt(String(body.categoryId)) : null }
      : {}),
    ...(body.brandId !== undefined ? { brandId: body.brandId ? BigInt(String(body.brandId)) : null } : {}),
    ...(body.unitId !== undefined ? { unitId: body.unitId ? BigInt(String(body.unitId)) : null } : {}),
    ...(body.taxId !== undefined ? { taxId: body.taxId ? BigInt(String(body.taxId)) : null } : {}),
    ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
    ...(slug !== undefined ? { slug } : {}),
    ...(body.compareAtPrice !== undefined
      ? { compareAtPrice: body.compareAtPrice != null && body.compareAtPrice !== "" ? body.compareAtPrice : null }
      : {}),
    ...(body.storefrontPublished !== undefined ? { storefrontPublished: Boolean(body.storefrontPublished) } : {}),
    ...(body.storefrontSeoTitle !== undefined
      ? { storefrontSeoTitle: body.storefrontSeoTitle != null ? String(body.storefrontSeoTitle).slice(0, 512) : null }
      : {}),
    ...(body.storefrontSeoDescription !== undefined
      ? {
          storefrontSeoDescription:
            body.storefrontSeoDescription != null ? String(body.storefrontSeoDescription) : null,
        }
      : {}),
    ...(gallery !== undefined
      ? {
          galleryImages:
            gallery === null ? Prisma.JsonNull : (gallery as Prisma.InputJsonValue),
        }
      : {}),
    ...(related !== undefined
      ? {
          relatedProductIds:
            related === null ? Prisma.JsonNull : (related as Prisma.InputJsonValue),
        }
      : {}),
    ...(body.pageTemplateKey !== undefined
      ? { pageTemplateKey: body.pageTemplateKey != null ? String(body.pageTemplateKey) : "product" }
      : {}),
    ...(variants !== undefined
      ? {
          variants:
            variants === null ? Prisma.JsonNull : (variants as Prisma.InputJsonValue),
        }
      : {}),
    ...(body.image !== undefined ? { image: body.image != null ? String(body.image) : null } : {}),
    ...(inventoryPolicy !== undefined ? { inventoryPolicy } : {}),
  };

  const row = await prisma.posProduct.update({
    where: { id: bid },
    data,
    include: { category: true, brand: true, unit: true, tax: true },
  });
  if (collectionIds !== undefined && row.organizationId) {
    await syncProductCollectionLinks(bid, row.organizationId, collectionIds);
  }
  const collectionIdsOut =
    collectionIds !== undefined
      ? collectionIds.map((id) => id.toString())
      : await listCollectionIdsForProduct(bid);
  return posOk(ser({ ...row, collectionIds: collectionIdsOut }));
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const { id } = await params;
  let bid: bigint;
  try {
    bid = BigInt(id);
  } catch {
    return posErr("Invalid id", 400);
  }
  const gate = await assertProductAccess(bid);
  if (!gate.ok) return gate.response;

  await prisma.posProduct.delete({ where: { id: bid } });
  return posOk({ success: true });
}
