import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  applyTopHeaderToHtml,
  discoverTopHeaderFromHtml,
  normalizeTopHeaderState,
} from "@/lib/storefront/theme-customizer-top-header";

const SAMPLE_INDEX = path.join(process.cwd(), "storage/storefront-liquid-themes/1000/w-1/index.html");

describe("theme-customizer-top-header", () => {
  it("normalizes empty/garbage payloads to a safe default", () => {
    const empty = {
      hidden: false,
      announcements: [],
      social: { facebook: "", twitter: "", instagram: "", youtube: "" },
    };
    expect(normalizeTopHeaderState(undefined)).toEqual(empty);
    expect(normalizeTopHeaderState("nope")).toEqual(empty);
    expect(normalizeTopHeaderState({})).toEqual(empty);
  });

  it("normalizes partial social payloads, dropping bad shapes", () => {
    const n = normalizeTopHeaderState({
      social: { facebook: "https://fb.com/me", twitter: 42, youtube: "https://yt.com/me" },
    });
    expect(n.social).toEqual({
      facebook: "https://fb.com/me",
      twitter: "",
      instagram: "",
      youtube: "https://yt.com/me",
    });
  });

  it("discovers social link placeholders as empty strings (theme default href='#')", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const d = discoverTopHeaderFromHtml(html);
    expect(d).not.toBeNull();
    expect(d?.social).toEqual({ facebook: "", twitter: "", instagram: "", youtube: "" });
  });

  it("rewrites only the platforms with non-empty URLs and leaves others on '#'", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const out = applyTopHeaderToHtml(html, {
      hidden: false,
      announcements: [],
      social: {
        facebook: "https://facebook.com/phillywaterice",
        twitter: "",
        instagram: "https://instagram.com/phillywaterice",
        youtube: "",
      },
    });

    /** Slice out just the social block so we don't accidentally match unrelated links elsewhere. */
    const socialChunk = out.slice(out.indexOf('<div class="social-icons'), out.indexOf("</ul></div>") + 11);
    expect(socialChunk).toMatch(/href="https:\/\/facebook\.com\/phillywaterice"[^>]*>[\s\S]*?icon-facebook/);
    expect(socialChunk).toMatch(/href="https:\/\/instagram\.com\/phillywaterice"[^>]*>[\s\S]*?icon-instagram/);
    /** Twitter + YouTube were left blank → stay on the theme placeholder. */
    expect(socialChunk).toMatch(/href="#"[^>]*>[\s\S]*?icon-twitter/);
    expect(socialChunk).toMatch(/href="#"[^>]*>[\s\S]*?icon-youtube/);
  });

  it("escapes quotes in social URLs to keep the href attribute valid", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const out = applyTopHeaderToHtml(html, {
      hidden: false,
      announcements: [],
      social: {
        facebook: 'https://fb.com/x"onerror=alert(1)',
        twitter: "",
        instagram: "",
        youtube: "",
      },
    });
    expect(out).not.toContain('"onerror=alert(1)"');
    expect(out).toContain('href="https://fb.com/x&quot;onerror=alert(1)"');
  });

  it("preserves text/href and assigns ids when missing", () => {
    const n = normalizeTopHeaderState({
      hidden: true,
      announcements: [
        { text: " Sale ", href: "/sale" },
        { id: "keep-me", text: "Hi", href: "" },
      ],
    });
    expect(n.hidden).toBe(true);
    expect(n.announcements).toHaveLength(2);
    expect(n.announcements[0]?.text).toBe(" Sale ");
    expect(n.announcements[0]?.href).toBe("/sale");
    expect(n.announcements[0]?.id).toMatch(/^pf-tophdr-/);
    expect(n.announcements[1]?.id).toBe("keep-me");
  });

  it("discovers stock announcement copy from the sample Concept index", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const d = discoverTopHeaderFromHtml(html);
    expect(d).not.toBeNull();
    expect(d?.announcements.length).toBeGreaterThan(0);
    expect(d?.announcements.some((a) => /BLACKFRIDAY/i.test(a.text))).toBe(true);
  });

  it("rewrites slides with new text and link", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const out = applyTopHeaderToHtml(html, {
      hidden: false,
      announcements: [
        { id: "a", text: "Free shipping over $50", href: "/shipping" },
        { id: "b", text: "Visit our flagship store", href: "" },
      ],
      social: { facebook: "", twitter: "", instagram: "", youtube: "" },
    });
    expect(out).toContain("Free shipping over $50");
    expect(out).toContain("Visit our flagship store");
    expect(out).toContain('href="/shipping"');
    expect(out).not.toMatch(/Save up to 60% with code BLACKFRIDAY/);
  });

  it("injects a hide-override style block when hidden=true", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const out = applyTopHeaderToHtml(html, {
      hidden: true,
      announcements: [],
      social: { facebook: "", twitter: "", instagram: "", youtube: "" },
    });
    expect(out).toMatch(/<style data-pf-tophdr-toggle>[^<]*display:none[^<]*<\/style>/i);
  });

  it("removes its own hide-override when toggled back on", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const empty = { facebook: "", twitter: "", instagram: "", youtube: "" };
    const hidden = applyTopHeaderToHtml(html, { hidden: true, announcements: [], social: empty });
    const shown = applyTopHeaderToHtml(hidden, { hidden: false, announcements: [], social: empty });
    expect(shown).not.toMatch(/data-pf-tophdr-toggle/);
  });

  it("is a safe no-op when the announcement bar section is absent", () => {
    const html = "<html><body><h1>hello</h1></body></html>";
    const out = applyTopHeaderToHtml(html, {
      hidden: true,
      announcements: [{ id: "a", text: "x", href: "" }],
      social: { facebook: "https://fb.com/x", twitter: "", instagram: "", youtube: "" },
    });
    expect(out).toBe(html);
    expect(discoverTopHeaderFromHtml(html)).toBeNull();
  });
});
