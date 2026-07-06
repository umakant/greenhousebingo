import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    partner: { aggregate: vi.fn() },
    partnerReferral: { aggregate: vi.fn() },
    partnerCommission: { aggregate: vi.fn() },
    partnerPayout: { aggregate: vi.fn() },
  },
}));

vi.mock("@/lib/settings-service", () => ({
  getSuperadminId: vi.fn().mockResolvedValue(1n),
  getSettingsForOwner: vi.fn(),
  upsertOwnerSettings: vi.fn(),
}));

import { getSettingsForOwner } from "@/lib/settings-service";
import {
  normalizeMarketplaceCommissionType,
  resolveMarketplaceCommissionRule,
} from "@/lib/partner-service";

const getSettings = getSettingsForOwner as unknown as Mock;

beforeEach(() => vi.clearAllMocks());

describe("normalizeMarketplaceCommissionType", () => {
  it("maps percentage aliases", () => {
    for (const v of ["percentage", "percent", "%", "PERCENTAGE"]) {
      expect(normalizeMarketplaceCommissionType(v)).toBe("percentage");
    }
  });
  it("maps flat aliases", () => {
    for (const v of ["flat", "fixed", "Flat"]) {
      expect(normalizeMarketplaceCommissionType(v)).toBe("flat");
    }
  });
  it("defaults to none for unknown/empty", () => {
    for (const v of ["", "nope", null, undefined]) {
      expect(normalizeMarketplaceCommissionType(v)).toBe("none");
    }
  });
});

describe("resolveMarketplaceCommissionRule", () => {
  it("uses a per-partner override when set", async () => {
    const rule = await resolveMarketplaceCommissionRule({
      marketplaceCommissionType: "percentage",
      marketplaceCommissionValue: 12,
    });
    expect(rule).toEqual({ type: "percentage", value: 12 });
    expect(getSettings).not.toHaveBeenCalled(); // no fallback needed
  });

  it("falls back to the platform default when the partner has no override", async () => {
    getSettings.mockResolvedValue({
      partner_marketplace_commission_type: "flat",
      partner_marketplace_commission_value: "7",
    });
    const rule = await resolveMarketplaceCommissionRule({
      marketplaceCommissionType: null,
      marketplaceCommissionValue: null,
    });
    expect(rule).toEqual({ type: "flat", value: 7 });
  });

  it("returns none when neither override nor default is configured", async () => {
    getSettings.mockResolvedValue({});
    const rule = await resolveMarketplaceCommissionRule({
      marketplaceCommissionType: null,
      marketplaceCommissionValue: null,
    });
    expect(rule).toEqual({ type: "none", value: 0 });
  });
});
