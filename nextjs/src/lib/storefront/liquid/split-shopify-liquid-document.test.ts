import { describe, expect, it } from "vitest";

import {
  parseHeadLinkTags,
  parseHeadStyleBlocks,
  splitShopifyLiquidDocument,
  stripHeadTagsFromMarkup,
} from "./split-shopify-liquid-document";

describe("splitShopifyLiquidDocument", () => {
  it("splits head and body", () => {
    const html = `<!doctype html><html><head><link rel="x" href="/a.css"><title>T</title></head><body><p>Hi</p></body></html>`;
    const { headInner, bodyInner } = splitShopifyLiquidDocument(html);
    expect(headInner).toContain('<link rel="x" href="/a.css">');
    expect(headInner).not.toContain("<title>");
    expect(bodyInner.trim()).toBe("<p>Hi</p>");
  });
});

describe("parseHeadLinkTags", () => {
  it("parses stylesheets and preconnects", () => {
    const head = `<meta charset="utf-8">
<link rel="preconnect" href="//fonts.gstatic.com" />
<link rel="stylesheet" href="http://localhost:5000/shop/theme-assets/1/assets/a.css" media="all" />
<link href='http://x/b.css' rel='stylesheet' />`;
    const links = parseHeadLinkTags(head);
    expect(links.filter((l) => l.rel === "preconnect")).toHaveLength(1);
    expect(links.filter((l) => l.rel === "stylesheet")).toHaveLength(2);
  });
});

describe("parseHeadStyleBlocks", () => {
  it("extracts style bodies", () => {
    const head = "<style> .a { color: red } </style>";
    const blocks = parseHeadStyleBlocks(head);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.css).toContain("color: red");
  });
});

describe("stripHeadTagsFromMarkup", () => {
  it("removes full tags", () => {
    const t = '<link rel="stylesheet" href="/x"> <p>y</p>';
    const out = stripHeadTagsFromMarkup(t, ['<link rel="stylesheet" href="/x">']);
    expect(out).not.toContain("stylesheet");
    expect(out).toContain("y");
  });
});
