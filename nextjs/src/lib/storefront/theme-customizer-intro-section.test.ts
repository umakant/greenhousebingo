import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  applyIntroSectionToHtml,
  extractRteBodyInnerHtml,
  findCollageIntroBounds,
} from "@/lib/storefront/theme-customizer-intro-section";

const SAMPLE_INDEX = path.join(process.cwd(), "storage/storefront-liquid-themes/1000/w-1/index.html");

describe("theme-customizer-intro-section", () => {
  it("extracts rte body from Concept collage-small block", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const bounds = findCollageIntroBounds(html);
    if (!bounds) return;
    const block = html.slice(bounds.start, bounds.end);
    const inner = extractRteBodyInnerHtml(block);
    expect(inner.length).toBeGreaterThan(50);
    expect(inner).toContain("Harmony Sound");
  });

  it("replaces intro body when HTML contains nested divs", () => {
    const block = `<div class="collage collage-small with-richtext"><div class="rich-text"><div class="rte body subtext-md"><div class="wrap"><p>OLD</p></div></div></div></div>`;
    const out = applyIntroSectionToHtml(block, {
      heading: "",
      headingHighlightWord: "",
      buttonText: "",
      buttonHref: "",
      bodyHtml: "<p><strong>NEW</strong></p>",
    });
    expect(out).toContain("<strong>NEW</strong>");
    expect(out).not.toContain("OLD");
  });
});
