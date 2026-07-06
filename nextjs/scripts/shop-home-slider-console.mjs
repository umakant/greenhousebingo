/**
 * Headless check: open Liquid /shop home, log every console + pageerror + failed request,
 * then click common hero slider controls (Flexslider, Dawn slideshow, Horizon slider-dots).
 *
 * Prerequisites: dev server reachable (default http://127.0.0.1:5000/shop) and
 *   npx playwright install chromium
 *
 * Env: SHOP_TEST_URL — full URL to storefront home (Liquid).
 */

import { chromium } from "playwright";

/** Use `localhost` (not 127.0.0.1) if your storefront domain is mapped to `localhost` in DB. */
const url = process.env.SHOP_TEST_URL || "http://localhost:5000/shop";
/** Fail the run if any of these appear in pageerror or console error text */
const FAIL_PATTERNS = [/SliderDots/i, /reading 'select'/i, /reading "select"/i];

const entries = [];

function record(e) {
  entries.push({ t: new Date().toISOString(), ...e });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  record({
    kind: "console",
    type: msg.type(),
    text: msg.text(),
    location: msg.location(),
  });
});

page.on("pageerror", (err) => {
  record({
    kind: "pageerror",
    text: String(err?.message || err),
    stack: err?.stack,
  });
});

page.on("requestfailed", (req) => {
  record({
    kind: "requestfailed",
    url: req.url(),
    error: req.failure()?.errorText,
  });
});

let status = 0;
try {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  status = resp?.status() ?? 0;
  record({ kind: "navigation", status, url });
} catch (e) {
  record({ kind: "navigation_error", text: String(e?.message || e) });
  console.error("Navigation failed — is the dev server running?", url);
  await browser.close();
  process.exit(2);
}

if (status >= 400) {
  record({ kind: "http_error", status });
}

await page.waitForTimeout(6000);

async function tryClick(selector, label) {
  const loc = page.locator(selector).first();
  const n = await loc.count();
  if (n === 0) return false;
  try {
    await loc.click({ timeout: 4000, force: true });
    record({ kind: "action", label, selector, ok: true });
    await page.waitForTimeout(600);
    return true;
  } catch (e) {
    record({ kind: "action", label, selector, ok: false, err: String(e?.message || e) });
    return false;
  }
}

const nextSelectors = [
  'slideshow-component button[name="next"]',
  "#home-slider .flex-direction-nav a.flex-next",
  "#home-slider .flex-direction-nav .flex-next",
  ".slider-button--next",
  'button.slider-button--next[name="next"]',
  'button[aria-label*="Next" i]',
  'button[aria-label*="next slide" i]',
];

const prevSelectors = [
  'slideshow-component button[name="previous"]',
  "#home-slider .flex-direction-nav a.flex-prev",
  "#home-slider .flex-direction-nav .flex-prev",
  ".slider-button--prev",
  'button.slider-button--prev[name="previous"]',
  'button[aria-label*="Previous" i]',
  'button[aria-label*="previous slide" i]',
];

for (const sel of nextSelectors) {
  if (await tryClick(sel, "next")) break;
}
for (const sel of prevSelectors) {
  if (await tryClick(sel, "prev")) break;
}

const dotHost = page.locator("slider-dots");
const dotCount = await dotHost.count();
if (dotCount > 0) {
  const dots = dotHost.first().locator("button");
  const n = await dots.count();
  for (let i = 0; i < Math.min(n, 3); i++) {
    try {
      await dots.nth(i).click({ timeout: 3000, force: true });
      record({ kind: "action", label: `slider-dots[${i}]`, ok: true });
      await page.waitForTimeout(500);
    } catch (e) {
      record({ kind: "action", label: `slider-dots[${i}]`, ok: false, err: String(e?.message || e) });
    }
  }
} else {
  const legacyDots = page.locator("#home-slider .flex-control-paging li a, .slider-counter__link");
  const m = await legacyDots.count();
  for (let i = 0; i < Math.min(m, 3); i++) {
    try {
      await legacyDots.nth(i).click({ timeout: 3000, force: true });
      record({ kind: "action", label: `legacy-dot[${i}]`, ok: true });
      await page.waitForTimeout(400);
    } catch (e) {
      record({ kind: "action", label: `legacy-dot[${i}]`, ok: false, err: String(e?.message || e) });
    }
  }
}

await browser.close();

console.log("\n========== SHOP HOME SLIDER / CONSOLE REPORT ==========\n");
console.log("URL:", url);
console.log("Total captured events:", entries.length, "\n");

for (const e of entries) {
  console.log(JSON.stringify(e));
}

const critical = entries.filter((e) => {
  const text = `${e.text || ""} ${e.stack || ""}`;
  if (e.kind === "pageerror") return FAIL_PATTERNS.some((re) => re.test(text));
  if (e.kind === "console" && e.type === "error") return FAIL_PATTERNS.some((re) => re.test(text));
  return false;
});

console.log("\n---------- Summary ----------");
const pageerrors = entries.filter((e) => e.kind === "pageerror");
const conErrors = entries.filter((e) => e.kind === "console" && e.type === "error");
const conWarn = entries.filter((e) => e.kind === "console" && e.type === "warning");
const failedReq = entries.filter((e) => e.kind === "requestfailed");
console.log("pageerror count:", pageerrors.length);
console.log("console.error count:", conErrors.length);
console.log("console.warning count:", conWarn.length);
console.log("requestfailed count:", failedReq.length);
console.log("SliderDots / select failures:", critical.length);

if (critical.length > 0) {
  console.error("\nEXIT 1: known slider regression signatures detected.");
  process.exit(1);
}

console.log("\nEXIT 0: no SliderDots/select pageerrors in captured log.");
process.exit(0);
