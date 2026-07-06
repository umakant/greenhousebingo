import { describe, expect, it } from "vitest";

import { shippingAmountForMethod, STOREFRONT_SHIPPING_FLAT_USD } from "@/lib/storefront/shipping-rates";

describe("shippingAmountForMethod", () => {
  it("returns flat amounts for known keys", () => {
    expect(shippingAmountForMethod("pickup")).toBe(STOREFRONT_SHIPPING_FLAT_USD.pickup);
    expect(shippingAmountForMethod("standard")).toBe(STOREFRONT_SHIPPING_FLAT_USD.standard);
    expect(shippingAmountForMethod("express")).toBe(STOREFRONT_SHIPPING_FLAT_USD.express);
  });

  it("defaults unknown keys to standard rate", () => {
    expect(shippingAmountForMethod("overnight")).toBe(STOREFRONT_SHIPPING_FLAT_USD.standard);
  });

  it("trims and handles nullish", () => {
    expect(shippingAmountForMethod("  standard  ")).toBe(STOREFRONT_SHIPPING_FLAT_USD.standard);
    expect(shippingAmountForMethod(null)).toBe(STOREFRONT_SHIPPING_FLAT_USD.standard);
    expect(shippingAmountForMethod(undefined)).toBe(STOREFRONT_SHIPPING_FLAT_USD.standard);
  });
});
