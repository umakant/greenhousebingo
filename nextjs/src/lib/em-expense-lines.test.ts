import { describe, expect, it } from "vitest";

import { emSubmitterNameForLine, formatEmSubmitterName } from "@/lib/em-expense-lines";

describe("em-expense-lines", () => {
  it("formatEmSubmitterName prefers name over email", () => {
    expect(formatEmSubmitterName("Umakant Sonwani", "u@example.com")).toBe("Umakant Sonwani");
    expect(formatEmSubmitterName("", "u@example.com")).toBe("u@example.com");
    expect(formatEmSubmitterName(null, null)).toBe("—");
  });

  it("emSubmitterNameForLine resolves from map", () => {
    const map = new Map([["42", "Umakant Sonwani"]]);
    expect(emSubmitterNameForLine(42n, map)).toBe("Umakant Sonwani");
    expect(emSubmitterNameForLine(99n, map)).toBe("—");
    expect(emSubmitterNameForLine(null, map)).toBe("—");
  });
});
