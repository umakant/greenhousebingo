import { prisma } from "@/lib/prisma";

export async function syncProductCollectionLinks(
  productId: bigint,
  organizationId: bigint,
  collectionIds: bigint[] | null | undefined,
): Promise<void> {
  if (collectionIds === undefined) return;
  const ids = collectionIds ?? [];

  await prisma.$transaction(async (tx) => {
    await tx.storefrontCollectionProduct.deleteMany({ where: { productId } });
    for (let i = 0; i < ids.length; i++) {
      const cid = ids[i]!;
      const col = await tx.storefrontCollection.findFirst({
        where: { id: cid, organizationId },
        select: { id: true },
      });
      if (!col) continue;
      await tx.storefrontCollectionProduct.create({
        data: { collectionId: cid, productId, sortOrder: i },
      });
    }
  });
}

export async function listCollectionIdsForProduct(productId: bigint): Promise<string[]> {
  const rows = await prisma.storefrontCollectionProduct.findMany({
    where: { productId },
    select: { collectionId: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => r.collectionId.toString());
}

/** Batch-load collection ids for POS product list (avoids N+1). */
export async function listCollectionIdsByProductIds(
  productIds: bigint[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!productIds.length) return map;
  const rows = await prisma.storefrontCollectionProduct.findMany({
    where: { productId: { in: productIds } },
    orderBy: [{ productId: "asc" }, { sortOrder: "asc" }],
    select: { productId: true, collectionId: true },
  });
  for (const r of rows) {
    const k = r.productId.toString();
    const arr = map.get(k) ?? [];
    arr.push(r.collectionId.toString());
    map.set(k, arr);
  }
  return map;
}
