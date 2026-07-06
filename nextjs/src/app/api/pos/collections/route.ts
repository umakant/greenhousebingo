import { prisma } from "@/lib/prisma";
import { posAuth, posOk, posErr, ser } from "@/lib/pos-api";
import { requirePosOrgId } from "@/lib/pos-product-scope";

export const dynamic = "force-dynamic";

/** Lightweight list for product assignment (Day 23) — same tenant as POS products. */
export async function GET() {
  if (!(await posAuth())) return posErr("Unauthorized", 401);
  const orgId = await requirePosOrgId();
  if (!orgId) return posErr("No company context.", 400);

  const rows = await prisma.storefrontCollection.findMany({
    where: { organizationId: orgId },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { id: true, title: true, slug: true, published: true },
  });

  return posOk(
    ser(
      rows.map((r) => ({
        id: r.id.toString(),
        title: r.title,
        slug: r.slug,
        published: r.published,
      })),
    ),
  );
}
