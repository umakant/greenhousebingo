import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  applySocialLinksToHtml,
  discoverSocialLinksFromHtml,
  isSocialLinksStateEmpty,
  normalizeSocialLinksState,
} from "@/lib/storefront/theme-customizer-social-links";

const SAMPLE_INDEX = path.join(process.cwd(), "storage/storefront-liquid-themes/1000/w-1/index.html");

describe("theme-customizer-social-links", () => {
  it("normalizes empty/garbage payloads", () => {
    const empty = { facebook: "", twitter: "", instagram: "", youtube: "" };
    expect(normalizeSocialLinksState(undefined)).toEqual(empty);
    expect(normalizeSocialLinksState("nope")).toEqual(empty);
    expect(normalizeSocialLinksState({})).toEqual(empty);
  });

  it("normalizes partial payloads, dropping bad shapes", () => {
    const n = normalizeSocialLinksState({
      facebook: "https://fb.com/me",
      twitter: 42,
      youtube: "https://yt.com/me",
    });
    expect(n).toEqual({
      facebook: "https://fb.com/me",
      twitter: "",
      instagram: "",
      youtube: "https://yt.com/me",
    });
  });

  it("isSocialLinksStateEmpty correctly detects all-blank vs. partial", () => {
    expect(isSocialLinksStateEmpty(undefined)).toBe(true);
    expect(isSocialLinksStateEmpty(null)).toBe(true);
    expect(isSocialLinksStateEmpty(normalizeSocialLinksState({}))).toBe(true);
    expect(isSocialLinksStateEmpty({ facebook: "https://fb.com/me", twitter: "", instagram: "", youtube: "" })).toBe(false);
  });

  it("discovery returns null when only theme placeholders (#) exist", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    expect(discoverSocialLinksFromHtml(html)).toBeNull();
  });

  it("discovery picks the first non-placeholder href per platform", () => {
    /** Hand-crafted snippet with two facebook anchors — first non-# wins. */
    const html = `
      <a href="#" class="social_platform"><svg class="icon icon-facebook"></svg></a>
      <a href="https://facebook.com/foo" class="social_platform"><svg class="icon icon-facebook"></svg></a>
      <a href="https://x.com/bar" class="social_platform"><svg class="icon icon-twitter"></svg></a>
    `;
    expect(discoverSocialLinksFromHtml(html)).toEqual({
      facebook: "https://facebook.com/foo",
      twitter: "https://x.com/bar",
      instagram: "",
      youtube: "",
    });
  });

  it("rewrites every social_platform anchor in the packaged Concept index across header / sidebar / footer", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");

    /** Sanity: stock theme has many social_platform anchors and they all start on '#'. */
    const stockAnchorMatches = [...html.matchAll(/<a\b[^>]*\bclass="[^"]*\bsocial_platform\b[^"]*"[^>]*>/gi)];
    expect(stockAnchorMatches.length).toBeGreaterThanOrEqual(8);

    const out = applySocialLinksToHtml(html, {
      facebook: "https://facebook.com/phillywaterice",
      twitter: "https://x.com/phillywaterice",
      instagram: "https://instagram.com/phillywaterice",
      youtube: "https://youtube.com/@phillywaterice",
    });

    /** Group anchor + its inner content so we can pair href ↔ icon class. */
    const anchorRe = /<a\b([^>]*\bclass="[^"]*\bsocial_platform\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi;
    const found = { facebook: 0, twitter: 0, instagram: 0, youtube: 0 };
    let m: RegExpExecArray | null;
    let totalSocialAnchors = 0;
    while ((m = anchorRe.exec(out))) {
      totalSocialAnchors++;
      const attrs = m[1] ?? "";
      const inner = m[2] ?? "";
      const hrefM = attrs.match(/\bhref="([^"]*)"/i);
      const href = hrefM ? hrefM[1] : "";
      if (inner.includes("icon-facebook") && href === "https://facebook.com/phillywaterice") found.facebook++;
      if (inner.includes("icon-twitter") && href === "https://x.com/phillywaterice") found.twitter++;
      if (inner.includes("icon-instagram") && href === "https://instagram.com/phillywaterice") found.instagram++;
      if (inner.includes("icon-youtube") && href === "https://youtube.com/@phillywaterice") found.youtube++;
    }

    /**
     * Count social_platform anchors per platform by re-walking with the SAME group-then-inspect
     * pattern the applier uses (so we don't accidentally skip an anchor by greedily globbing
     * across another anchor's `</a>`).
     */
    const countPlatformAnchors = (cls: string): number => {
      const re = /<a\b[^>]*\bclass="[^"]*\bsocial_platform\b[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      let count = 0;
      let mm: RegExpExecArray | null;
      while ((mm = re.exec(out))) {
        if ((mm[1] ?? "").includes(cls)) count++;
      }
      return count;
    };

    expect(found.facebook).toBe(countPlatformAnchors("icon-facebook"));
    expect(found.twitter).toBe(countPlatformAnchors("icon-twitter"));
    expect(found.instagram).toBe(countPlatformAnchors("icon-instagram"));
    expect(found.youtube).toBe(countPlatformAnchors("icon-youtube"));
    expect(totalSocialAnchors).toBe(stockAnchorMatches.length);
    /** And we expect AT LEAST 4 of each — header + sidebar + footer occurrences. */
    expect(found.facebook).toBeGreaterThanOrEqual(4);
    expect(found.twitter).toBeGreaterThanOrEqual(4);
    expect(found.instagram).toBeGreaterThanOrEqual(4);
    expect(found.youtube).toBeGreaterThanOrEqual(4);

    /** No `href="#"` should remain on a social_platform anchor. */
    const placeholderRe = /<a\b[^>]*\bclass="[^"]*\bsocial_platform\b[^"]*"[^>]*\bhref="#"/gi;
    expect(out).not.toMatch(placeholderRe);
  });

  it("only updates the platforms with non-empty URLs (others keep their existing href)", () => {
    const html = `
      <a href="#" class="social_platform"><svg class="icon icon-facebook"></svg></a>
      <a href="#" class="social_platform"><svg class="icon icon-twitter"></svg></a>
    `;
    const out = applySocialLinksToHtml(html, {
      facebook: "https://facebook.com/me",
      twitter: "",
      instagram: "",
      youtube: "",
    });
    expect(out).toContain('href="https://facebook.com/me"');
    /** Twitter should still be on '#'. */
    expect(out).toMatch(/href="#"\s+class="social_platform"><svg class="icon icon-twitter"/);
  });

  it("escapes quote characters in URLs to keep attribute valid", () => {
    const html = `<a href="#" class="social_platform"><svg class="icon icon-facebook"></svg></a>`;
    const out = applySocialLinksToHtml(html, {
      facebook: 'https://fb.com/x"onerror=alert(1)',
      twitter: "",
      instagram: "",
      youtube: "",
    });
    expect(out).not.toContain('"onerror=alert(1)"');
    expect(out).toContain('href="https://fb.com/x&quot;onerror=alert(1)"');
  });

  it("is a safe no-op when there are no social_platform anchors", () => {
    const html = "<html><body><h1>hi</h1></body></html>";
    const out = applySocialLinksToHtml(html, {
      facebook: "https://fb.com/me",
      twitter: "",
      instagram: "",
      youtube: "",
    });
    expect(out).toBe(html);
  });

  it("re-applying with the same state is idempotent", () => {
    if (!fs.existsSync(SAMPLE_INDEX)) return;
    const html = fs.readFileSync(SAMPLE_INDEX, "utf8");
    const state = {
      facebook: "https://facebook.com/me",
      twitter: "https://x.com/me",
      instagram: "https://instagram.com/me",
      youtube: "https://youtube.com/@me",
    };
    const once = applySocialLinksToHtml(html, state);
    const twice = applySocialLinksToHtml(once, state);
    expect(twice).toBe(once);
  });
});
