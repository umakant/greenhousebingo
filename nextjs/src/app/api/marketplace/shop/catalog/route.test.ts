import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@/lib/marketplace-company-api-guard", () => ({ guardMarketplaceCompany: vi.fn() }));
vi.mock("@/lib/marketplace-service", () => ({
  serializeProduct: vi.fn((p: { id: bigint; name: string }) => ({ id: p.id.toString(), name: p.name })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { marketplaceProduct: { findMany: vi.fn() } },
}));

import { guardMarketplaceCompany } from "@/lib/marketplace-company-api-guard";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/marketplace/shop/catalog/route";

const guard = guardMarketplaceCompany as unknown as Mock;
const findMany = prisma.marketplaceProduct.findMany as unknown as Mock;

function makeReq(url = "http://localhost/api/marketplace/shop/catalog") {
  return { url, cookies: { get: () => undefined } } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  guard.mockResolvedValue({ ok: true, ctx: { organizationId: 100n, userId: 5n } });
});

describe("GET /api/marketplace/shop/catalog", () => {
  it("returns the guard's 403 response when access is denied", async () => {
    guard.mockResolvedValue({ ok: false, response: { status: 403 } });
    const res = (await GET(makeReq())) as unknown as { status: number };
    expect(res.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("only lists active products from active vendors (inactive hidden)", async () => {
    findMany
      .mockResolvedValueOnce([
        { id: 1n, name: "Cherry", vendor: { name: "Water Ice Express" } },
      ])
      .mockResolvedValueOnce([{ category: "frozen" }]);

    const res = await GET(makeReq());
    const body = await res.json();

    // The catalog query is scoped to active products + active vendors.
    const where = findMany.mock.calls[0][0].where;
    expect(where.status).toBe("active");
    expect(where.vendor).toEqual({ status: "active" });

    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Cherry");
    expect(body.categories).toEqual(["frozen"]);
  });
});
