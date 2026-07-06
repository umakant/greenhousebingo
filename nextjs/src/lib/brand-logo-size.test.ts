import { describe, expect, it } from "vitest";

import {
  brandLogoImageStyle,
  DEFAULT_BRAND_LOGO_HEIGHT,
  DEFAULT_BRAND_LOGO_WIDTH,
  parseBrandLogoDimension,
  resolveBrandLogoHeight,
  resolveBrandLogoWidth,
  syncBrandLogoDimensions,
} from "./brand-logo-size";

describe("brand-logo-size", () => {
  it("falls back for invalid dimensions", () => {
    expect(parseBrandLogoDimension("", DEFAULT_BRAND_LOGO_WIDTH)).toBe(220);
    expect(parseBrandLogoDimension("0", DEFAULT_BRAND_LOGO_WIDTH)).toBe(220);
    expect(parseBrandLogoDimension("abc", DEFAULT_BRAND_LOGO_HEIGHT)).toBe(65);
  });

  it("parses positive integers", () => {
    expect(parseBrandLogoDimension("180", DEFAULT_BRAND_LOGO_WIDTH)).toBe(180);
    expect(parseBrandLogoDimension(" 48 ", DEFAULT_BRAND_LOGO_HEIGHT)).toBe(48);
  });

  it("builds image style from width and height", () => {
    expect(brandLogoImageStyle("200", "50")).toEqual({
      maxWidth: 200,
      maxHeight: 50,
      width: "auto",
      height: "auto",
    });
  });

  it("resolves shared logo dimensions from either key", () => {
    expect(resolveBrandLogoWidth({ logo_dark_width: "180" })).toBe("180");
    expect(resolveBrandLogoHeight({ logo_light_height: "48" })).toBe("48");
  });

  it("syncs all logo dimension keys", () => {
    expect(syncBrandLogoDimensions("200", "50")).toEqual({
      logo_dark_width: "200",
      logo_dark_height: "50",
      logo_light_width: "200",
      logo_light_height: "50",
    });
  });
});
