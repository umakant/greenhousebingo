import { describe, expect, it } from "vitest";

import { effectiveVariantStockUnits, parsePosProductVariants } from "@/lib/storefront/bundle-catalog";

describe("parsePosProductVariants + effectiveVariantStockUnits", () => {
  it("omits stock when not set so storefront can fall back to parent inventory", () => {
    const rows = parsePosProductVariants([
      { id: "v1", name: "Default", price: 20 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.stock).toBeUndefined();
    expect(effectiveVariantStockUnits(rows[0]!, 15)).toBe(15);
  });

  it("uses explicit variant stock when finite", () => {
    const rows = parsePosProductVariants([{ id: "a", name: "Small", price: 10, stock: 3 }]);
    expect(effectiveVariantStockUnits(rows[0]!, 99)).toBe(3);
  });

  it("ignores invalid stock strings and falls back to parent", () => {
    const rows = parsePosProductVariants([{ id: "b", name: "M", price: 10, stock: "x" }]);
    expect(rows[0]?.stock).toBeUndefined();
    expect(effectiveVariantStockUnits(rows[0]!, 7)).toBe(7);
  });
});
