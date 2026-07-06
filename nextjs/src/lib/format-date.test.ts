import { describe, expect, it } from "vitest";

import { formatDate, normalizeDateFormatToPhp } from "@/lib/format-date";

describe("normalizeDateFormatToPhp", () => {
  it("maps legacy DD MMM, YYYY to US PHP format", () => {
    expect(normalizeDateFormatToPhp("DD MMM, YYYY")).toBe("m/d/Y");
  });

  it("converts MM/DD/YYYY to m/d/Y", () => {
    expect(normalizeDateFormatToPhp("MM/DD/YYYY")).toBe("m/d/Y");
  });
});

describe("formatDate", () => {
  it("formats with MM/DD/YYYY setting", () => {
    expect(formatDate("2026-03-22", { dateFormat: "MM/DD/YYYY" })).toBe("03/22/2026");
  });

  it("maps legacy DD MMM, YYYY seed value to MM/DD/YYYY", () => {
    expect(formatDate("2026-03-22", { dateFormat: "DD MMM, YYYY" })).toBe("03/22/2026");
  });
});
