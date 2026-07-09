import { describe, expect, it } from "vitest";

import {
  DEFAULT_BRAND_CUSTOM_COLOR,
  formatBrandHexColorInput,
  normalizeBrandHexColor,
  PLANT_BINGO_FOREST_HEX,
  resolveBrandPrimaryHex,
} from "./brand-theme";

describe("formatBrandHexColorInput", () => {
  it("auto-prefixes # when typing hex digits", () => {
    expect(formatBrandHexColorInput("5")).toBe("#5");
    expect(formatBrandHexColorInput("515f1a")).toBe("#515f1a");
  });

  it("strips non-hex characters", () => {
    expect(formatBrandHexColorInput("#51-5f!1a")).toBe("#515f1a");
  });

  it("limits to six hex digits", () => {
    expect(formatBrandHexColorInput("515f1a99")).toBe("#515f1a");
  });

  it("returns empty for cleared input", () => {
    expect(formatBrandHexColorInput("")).toBe("");
  });
});

describe("normalizeBrandHexColor", () => {
  it("adds # prefix when missing", () => {
    expect(normalizeBrandHexColor("515f1a")).toBe("#515f1a");
  });

  it("expands 3-digit hex", () => {
    expect(normalizeBrandHexColor("#4e7")).toBe("#44ee77");
  });

  it("falls back for invalid values", () => {
    expect(normalizeBrandHexColor("not-a-color", "#abc123")).toBe("#abc123");
  });
});

describe("resolveBrandPrimaryHex", () => {
  it("uses custom color without hash prefix", () => {
    expect(resolveBrandPrimaryHex("custom", "515f1a")).toBe("#515f1a");
  });

  it("uses preset green when theme is not custom", () => {
    expect(resolveBrandPrimaryHex("green", "#515f1a")).toBe("#10b981");
  });

  it("falls back when custom color is invalid", () => {
    expect(resolveBrandPrimaryHex("custom", "zzzzzz")).toBe(DEFAULT_BRAND_CUSTOM_COLOR);
  });

  it("matches Plant Bingo forest token", () => {
    expect(resolveBrandPrimaryHex("custom", PLANT_BINGO_FOREST_HEX)).toBe("#4e735a");
  });
});
