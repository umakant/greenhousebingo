import { describe, expect, it } from "vitest";

import { applyBrandSettingsFallback, companyHasOwnBrandLogos, reconcileCompanyBrandLogos } from "@/lib/settings-service";

describe("applyBrandSettingsFallback", () => {
  it("fills blank company logo fields from superadmin without overwriting company values", () => {
    const target = { logo_light: "", logo_dark: "", favicon: "", titleText: "Acme" };
    const fallback = {
      logo_light: "/pf-light.png",
      logo_dark: "/pf-dark.png",
      favicon: "/pf.ico",
      titleText: "Platform",
    };
    applyBrandSettingsFallback(target, fallback);
    expect(target.logo_light).toBe("/pf-light.png");
    expect(target.logo_dark).toBe("/pf-dark.png");
    expect(target.favicon).toBe("/pf.ico");
    expect(target.titleText).toBe("Acme");
  });
});

describe("companyHasOwnBrandLogos", () => {
  it("requires company logo and favicon", () => {
    expect(companyHasOwnBrandLogos({ logo_light: "/a.png", favicon: "/f.ico" })).toBe(true);
    expect(companyHasOwnBrandLogos({ logo_dark: "/a.png", favicon: "/f.ico" })).toBe(true);
    expect(companyHasOwnBrandLogos({ logo_light: "/a.png" })).toBe(false);
    expect(companyHasOwnBrandLogos({ favicon: "/f.ico" })).toBe(false);
    expect(companyHasOwnBrandLogos({})).toBe(false);
  });
});

describe("reconcileCompanyBrandLogos", () => {
  it("copies company logo_light to logo_dark when company did not set logo_dark", () => {
    const merged = {
      logo_light: "/uploads/philly.png",
      logo_dark: "/uploads/paper-flight.png",
    };
    const out = reconcileCompanyBrandLogos({ logo_light: "/uploads/philly.png" }, merged);
    expect(out.logo_dark).toBe("/uploads/philly.png");
    expect(out.logo_light).toBe("/uploads/philly.png");
  });

  it("copies company logo_dark to logo_light when company did not set logo_light", () => {
    const merged = {
      logo_light: "/uploads/paper-flight-light.png",
      logo_dark: "/uploads/philly-dark.png",
    };
    const out = reconcileCompanyBrandLogos({ logo_dark: "/uploads/philly-dark.png" }, merged);
    expect(out.logo_light).toBe("/uploads/philly-dark.png");
  });

  it("leaves merged logos unchanged when company set both", () => {
    const merged = {
      logo_light: "/a.png",
      logo_dark: "/b.png",
    };
    const out = reconcileCompanyBrandLogos(
      { logo_light: "/a.png", logo_dark: "/b.png" },
      merged,
    );
    expect(out).toEqual(merged);
  });

  it("leaves merged logos unchanged when company set neither", () => {
    const merged = { logo_light: "/pf-light.png", logo_dark: "/pf-dark.png" };
    const out = reconcileCompanyBrandLogos({}, merged);
    expect(out).toEqual(merged);
  });

  it("syncs favicon and logo_icon when company set only one", () => {
    const merged = { favicon: "/pf.ico", logo_icon: "/other.ico" };
    const out = reconcileCompanyBrandLogos({ favicon: "/company.ico" }, merged);
    expect(out.favicon).toBe("/company.ico");
    expect(out.logo_icon).toBe("/company.ico");
  });

  it("syncs logo_icon to favicon when company set only logo_icon", () => {
    const merged = { favicon: "/pf.ico", logo_icon: "/pf.ico" };
    const out = reconcileCompanyBrandLogos({ logo_icon: "/company.ico" }, merged);
    expect(out.favicon).toBe("/company.ico");
    expect(out.logo_icon).toBe("/company.ico");
  });
});
