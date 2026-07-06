import { describe, expect, it } from "vitest";

import {
  validateOwnershipChange,
  validateOwnershipPercentInputs,
} from "@/lib/brand-ownership-validation";

describe("validateOwnershipPercentInputs", () => {
  it("rejects minimum greater than current", () => {
    const errors = validateOwnershipPercentInputs(40, 50);
    expect(errors.some((e) => e.includes("Minimum ownership"))).toBe(true);
  });

  it("accepts valid pair", () => {
    expect(validateOwnershipPercentInputs(40, 40)).toEqual([]);
  });
});

describe("validateOwnershipChange", () => {
  const fullBrand = [
    { id: "1", currentOwnershipPercent: 20 },
    { id: "2", currentOwnershipPercent: 40 },
    { id: "3", currentOwnershipPercent: 40 },
  ];

  it("flags conflict when total would exceed 100%", () => {
    const result = validateOwnershipChange(fullBrand, null, 50, 50);
    expect(result.isValid).toBe(false);
    expect(result.currentAssignedOwnership).toBe(100);
    expect(result.totalAfterChange).toBe(150);
    expect(result.conflictMessage).toMatch(/exceed 100%/);
  });

  it("allows valid add when space available", () => {
    const partial = [{ id: "1", currentOwnershipPercent: 60 }];
    const result = validateOwnershipChange(partial, null, 40, 40);
    expect(result.isValid).toBe(true);
    expect(result.totalAfterChange).toBe(100);
  });

  it("allows edit that keeps total at 100%", () => {
    const result = validateOwnershipChange(fullBrand, "1", 20, 20);
    expect(result.isValid).toBe(true);
    expect(result.totalAfterChange).toBe(100);
  });

  it("computes available ownership before add", () => {
    const partial = [
      { id: "1", currentOwnershipPercent: 60 },
      { id: "2", currentOwnershipPercent: 40 },
    ];
    const result = validateOwnershipChange(partial, null, 10, 10);
    expect(result.availableOwnership).toBe(0);
    expect(result.isValid).toBe(false);
  });
});
