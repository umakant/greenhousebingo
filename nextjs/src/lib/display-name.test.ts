import { describe, expect, it } from "vitest";

import { combineDisplayName, splitDisplayName } from "@/lib/display-name";

describe("display-name", () => {
  it("combines first and last name", () => {
    expect(combineDisplayName("Jane", "Doe")).toBe("Jane Doe");
    expect(combineDisplayName("Jane", "")).toBe("Jane");
  });

  it("splits full name on first space", () => {
    expect(splitDisplayName("Umakant Sonwani")).toEqual({
      firstName: "Umakant",
      lastName: "Sonwani",
    });
    expect(splitDisplayName("Madonna")).toEqual({ firstName: "Madonna", lastName: "" });
  });
});
