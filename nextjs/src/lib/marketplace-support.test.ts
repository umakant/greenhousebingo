import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  MARKETPLACE_TICKET_CATEGORIES,
  isMarketplaceTicketCategory,
  makeMarketplaceTicketCode,
} from "@/lib/marketplace-support";

describe("marketplace support ticket categories (UI/server contract)", () => {
  it("exposes exactly the six required order-issue categories", () => {
    expect([...MARKETPLACE_TICKET_CATEGORIES]).toEqual([
      "Order issue",
      "Payment issue",
      "Delivery question",
      "Missing items",
      "Damaged items",
      "Refund request",
    ]);
  });

  it("validates allowed categories (and trims input)", () => {
    expect(isMarketplaceTicketCategory("Refund request")).toBe(true);
    expect(isMarketplaceTicketCategory("  Damaged items  ")).toBe(true);
    expect(isMarketplaceTicketCategory("Something else")).toBe(false);
    expect(isMarketplaceTicketCategory(123)).toBe(false);
    expect(isMarketplaceTicketCategory(null)).toBe(false);
  });

  it("makes a 10-digit ticket code", () => {
    expect(makeMarketplaceTicketCode()).toMatch(/^\d{10}$/);
  });
});
