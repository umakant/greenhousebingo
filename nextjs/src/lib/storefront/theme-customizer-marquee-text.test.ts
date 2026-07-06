import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { applyMarqueeTextToHtml, discoverMarqueeTextFromHtml } from "@/lib/storefront/theme-customizer-marquee-text";

const SAMPLE_INDEX = path.join(process.cwd(), "storage/storefront-liquid-themes/1000/w-1/index.html");

describe("theme-customizer-marquee-text", () => {
  it("discovers outline marquee text from Concept index", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const d = discoverMarqueeTextFromHtml(html);
    expect(d?.text).toContain("Philly Water Ice");
  });

  it("replaces every duplicated stencil cell in the outline marquee", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const out = applyMarqueeTextToHtml(html, { text: "Test Marquee X" });
    const matches = [...out.matchAll(/<strong>Test Marquee X<\/strong>/g)];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(out).not.toMatch(/<strong>Philly Water Ice<\/strong>/);
  });
});
