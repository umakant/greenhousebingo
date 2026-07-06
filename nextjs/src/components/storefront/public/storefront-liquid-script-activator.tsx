"use client";

import * as React from "react";

const ACTIVATED_ATTR = "data-pf-liquid-script-activated";
const PF_THEME_SCRIPT_MOUNT_ID = "pf-theme-script-mount";

type PfThemeScriptGlobals = Window & {
  __pfThemeExecutedScriptSrcs?: Set<string>;
  __pfThemeExecutedInlineHashes?: Set<string>;
};

/**
 * Same file is often referenced with different query strings (cache keys) or `./` vs absolute.
 * Dedupe on origin + pathname only so `vendor.js` / `theme.js` execute once per page lifetime.
 */
function normalizeScriptSrcForDedup(src: string): string {
  const t = src.trim();
  if (!t) return t;
  try {
    const u = new URL(t, window.location.href);
    return `${u.origin}${u.pathname}`;
  } catch {
    return t;
  }
}

/** Concept vendor/theme expose these globals when their bundles have already run (e.g. Fast Refresh). */
function themeBundleGlobalsAlreadyPresent(normSrc: string): boolean {
  let path: string;
  try {
    path = new URL(normSrc, window.location.href).pathname.toLowerCase();
  } catch {
    return false;
  }
  const file = path.split("/").pop() ?? "";
  const w = window as unknown as { LazyImage?: unknown; LocalizationForm?: unknown };
  if (file === "vendor.js") return typeof w.LazyImage !== "undefined";
  if (file === "theme.js") return typeof w.LocalizationForm !== "undefined";
  return false;
}

function getExecutedScriptSrcs(): Set<string> {
  const w = window as PfThemeScriptGlobals;
  if (!w.__pfThemeExecutedScriptSrcs) w.__pfThemeExecutedScriptSrcs = new Set();
  return w.__pfThemeExecutedScriptSrcs;
}

function getExecutedInlineHashes(): Set<string> {
  const w = window as PfThemeScriptGlobals;
  if (!w.__pfThemeExecutedInlineHashes) w.__pfThemeExecutedInlineHashes = new Set();
  return w.__pfThemeExecutedInlineHashes;
}

/**
 * React 19 may seal `document.head` mutations for scripts; append can throw
 * `Cannot assign to read only property 'protect'`. Use a plain mount on `<html>`.
 */
function appendThemeScriptToDom(script: HTMLScriptElement): void {
  const mountFallback = () => {
    let mount = document.getElementById(PF_THEME_SCRIPT_MOUNT_ID);
    if (!mount) {
      mount = document.createElement("div");
      mount.id = PF_THEME_SCRIPT_MOUNT_ID;
      mount.setAttribute("aria-hidden", "true");
      mount.style.display = "none";
      document.documentElement.appendChild(mount);
    }
    mount.appendChild(script);
  };
  try {
    document.head.appendChild(script);
  } catch {
    mountFallback();
  }
}

/** Shopify OS snippets that assume Online Store 2.0 section markup we do not render off-platform. */
function shouldSkipThemeScriptSrc(src: string): boolean {
  const u = src.toLowerCase();
  return u.includes("pickup-availability");
}

function djb2Hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Collapse trivial differences so duplicate theme snippets dedupe across sections / passes. */
function normalizeInlineForDedup(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type LiquidDedupBucket = {
  externalSrc: Set<string>;
  inlineHash: Set<string>;
  inertHandled: WeakSet<HTMLScriptElement>;
};

function getLiquidDedupBucket(fingerprint: string): LiquidDedupBucket {
  const w = window as unknown as { __pfLiquidDedupByFp?: Record<string, LiquidDedupBucket> };
  if (!w.__pfLiquidDedupByFp) w.__pfLiquidDedupByFp = {};
  const map = w.__pfLiquidDedupByFp;
  if (!map[fingerprint]) {
    map[fingerprint] = {
      externalSrc: new Set(),
      inlineHash: new Set(),
      inertHandled: new WeakSet(),
    };
  }
  return map[fingerprint];
}

/** Classic scripts only; JSON-LD / importmap / templates are inert in real pages too. */
function inlineScriptExecMode(old: HTMLScriptElement): "classic-append" | "module-append" | "skip" {
  const mime = old.getAttribute("type")?.trim().toLowerCase() ?? "";
  if (!mime || mime === "text/javascript" || mime === "application/javascript") {
    return "classic-append";
  }
  if (mime === "module") return "module-append";
  if (
    mime === "application/json" ||
    mime === "application/ld+json" ||
    mime === "importmap" ||
    mime === "text/template" ||
    mime === "text/html" ||
    mime === "text/plain"
  ) {
    return "skip";
  }
  if (mime.includes("javascript") || mime.includes("ecmascript")) return "classic-append";
  return "skip";
}

function isBenignInlineActivationError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes("already been declared") ||
    msg.includes("read only property 'protect'") ||
    msg.includes('read only property "protect"')
  );
}

type InlineErrFrame = { benign: boolean; any: boolean };
const inlineScriptErrorFrameStack: InlineErrFrame[] = [];
let inlineScriptErrorHookInstalled = false;

/**
 * One capture listener for the whole app lifetime, registered as early as possible so we run
 * before Next's dev overlay listener and can `preventDefault` on known-benign theme double-runs.
 */
function ensureInlineScriptBenignErrorHook(): void {
  if (typeof window === "undefined" || inlineScriptErrorHookInstalled) return;
  inlineScriptErrorHookInstalled = true;
  window.addEventListener(
    "error",
    (ev: ErrorEvent) => {
      if (inlineScriptErrorFrameStack.length === 0) return;
      const top = inlineScriptErrorFrameStack[inlineScriptErrorFrameStack.length - 1];
      top.any = true;
      const err = ev.error ?? new Error(ev.message);
      if (isBenignInlineActivationError(err)) {
        top.benign = true;
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    },
    true,
  );
}

/**
 * Inline `<script>` execution reports errors via `window` "error", not to `appendChild`'s caller.
 */
function appendInlineScriptWithBenignErrorTrap(run: () => void): "ok" | "benign" | "error" {
  ensureInlineScriptBenignErrorHook();
  const frame: InlineErrFrame = { benign: false, any: false };
  inlineScriptErrorFrameStack.push(frame);
  try {
    try {
      run();
    } catch (e) {
      if (isBenignInlineActivationError(e)) {
        return "benign";
      }
      throw e;
    }
  } finally {
    inlineScriptErrorFrameStack.pop();
  }
  if (frame.benign) return "benign";
  if (frame.any) return "error";
  return "ok";
}

let themeRuntimeNoiseHookInstalled = false;

function isThemeJsScriptSrc(src: string): boolean {
  try {
    return new URL(src, window.location.href).pathname.toLowerCase().endsWith("/theme.js");
  } catch {
    return /(^|\/)theme\.js(\?|$)/i.test(src);
  }
}

/**
 * Concept `theme.js` registers `tabs-element` whose `attributeChangedCallback` calls
 * `button.unload()` / `button.load()` on carousel dot `<button>` nodes. Those methods exist only on
 * upgraded indicator components on Shopify; plain buttons throw. Patch before `theme.js` runs.
 */
const PF_TABS_PROTOTYPE_SHIMMED = "__pfTabsIndicatorPrototypeShimmed";

function shimIndicatorButtonsOnTabsInstance(host: HTMLElement): void {
  host.querySelectorAll(".indicators button").forEach((el) => {
    const b = el as HTMLButtonElement & { unload?: () => void; load?: () => void };
    if (typeof b.unload !== "function") b.unload = () => {};
    if (typeof b.load !== "function") b.load = () => {};
  });
}

type AttrCb = (
  this: HTMLElement,
  attrName: string,
  oldValue: string | null,
  newValue: string | null,
) => void;

const PF_TABS_CALLBACK_WRAPPED = "__pfTabsAttrCbWrapped";

function wrapTabsAttributeChangedCallback(ownerProto: object, desc: PropertyDescriptor, fn: AttrCb): void {
  const wrapped: AttrCb = function attributeChangedCallback(
    this: HTMLElement,
    attrName: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    shimIndicatorButtonsOnTabsInstance(this);
    try {
      fn.call(this, attrName, oldValue, newValue);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("unload is not a function") || msg.includes("load is not a function")) return;
      throw e;
    }
  };
  Object.defineProperty(wrapped, PF_TABS_CALLBACK_WRAPPED, { value: true, enumerable: false });
  Object.defineProperty(ownerProto, "attributeChangedCallback", { ...desc, value: wrapped });
}

/**
 * Patches the live `tabs-element` class (covers HMR / skipped `theme.js` where `customElements.define`
 * ran before our hook, or minified prototypes our define-intercept missed).
 */
function applyTabsElementIndicatorPrototypeShim(): void {
  if (typeof customElements === "undefined") return;
  const ctor = customElements.get("tabs-element") as CustomElementConstructor | undefined;
  if (!ctor?.prototype) return;
  const rootProto = ctor.prototype as unknown as Record<string, unknown>;
  if (rootProto[PF_TABS_PROTOTYPE_SHIMMED]) return;

  let p: object | null = ctor.prototype as object;
  while (p) {
    const desc = Object.getOwnPropertyDescriptor(p, "attributeChangedCallback");
    const fn = desc?.value;
    if (typeof fn !== "function" || !desc) {
      p = Object.getPrototypeOf(p);
      continue;
    }
    if (PF_TABS_CALLBACK_WRAPPED in fn) {
      rootProto[PF_TABS_PROTOTYPE_SHIMMED] = true;
      return;
    }
    wrapTabsAttributeChangedCallback(p, desc, fn as AttrCb);
    rootProto[PF_TABS_PROTOTYPE_SHIMMED] = true;
    return;
  }
}

function ensurePfTabsElementUnloadPatch(): void {
  const w = window as Window & { __pfTabsElementUnloadPatch?: boolean };
  if (typeof window === "undefined" || w.__pfTabsElementUnloadPatch) return;
  w.__pfTabsElementUnloadPatch = true;
  const orig = customElements.define.bind(customElements);
  customElements.define = (
    name: string,
    constructor: CustomElementConstructor,
    options?: ElementDefinitionOptions,
  ): void => {
    if (name === "tabs-element") {
      let proto: object | null = (constructor as unknown as { prototype: object }).prototype;
      while (proto) {
        const desc = Object.getOwnPropertyDescriptor(proto, "attributeChangedCallback");
        const fn = desc?.value;
        if (typeof fn === "function" && desc) {
          wrapTabsAttributeChangedCallback(proto, desc, fn as AttrCb);
          break;
        }
        proto = Object.getPrototypeOf(proto);
      }
    }
    orig(name, constructor, options);
    if (name === "tabs-element") queueMicrotask(() => applyTabsElementIndicatorPrototypeShim());
  };
}

/**
 * Declarative `<template shadowrootmode>` is ignored when HTML is assigned via `innerHTML`.
 * Promote templates depth-first so theme sliders / thumbnails behave and the console warning stops.
 */
function promoteDeclarativeShadowRootsFrom(container: ParentNode): void {
  if (typeof document === "undefined") return;
  let template: HTMLTemplateElement | null;
  let guard = 0;
  while ((template = container.querySelector?.("template[shadowrootmode]") ?? null) && guard++ < 500) {
    const host = template.parentElement;
    if (!(host instanceof HTMLElement)) {
      template.removeAttribute("shadowrootmode");
      continue;
    }
    const raw = template.getAttribute("shadowrootmode")?.toLowerCase() ?? "open";
    const mode: ShadowRootMode = raw === "closed" ? "closed" : "open";
    try {
      let shadow = host.shadowRoot;
      if (!shadow) {
        shadow = host.attachShadow({ mode });
        shadow.appendChild(template.content.cloneNode(true));
      }
      template.remove();
      if (shadow) promoteDeclarativeShadowRootsFrom(shadow);
    } catch {
      template.removeAttribute("shadowrootmode");
    }
  }
}

/**
 * Theme JS assumes a full Shopify document lifecycle; under React hydration some callbacks run
 * before tab/media helpers are fully upgraded. Swallow known noisy `theme.js` errors so devtools
 * and Next’s overlay stay usable (errors are non-actionable for our host integration).
 */
function ensureThemeRuntimeNoiseSuppressed(): void {
  if (typeof window === "undefined" || themeRuntimeNoiseHookInstalled) return;
  themeRuntimeNoiseHookInstalled = true;
  window.addEventListener(
    "error",
    (ev: ErrorEvent) => {
      const file = (ev.filename ?? "").toLowerCase();
      if (!file.includes("theme.js") && !file.includes("vendor.js")) return;
      const msg = (ev.message || (ev.error instanceof Error ? ev.error.message : String(ev.error ?? ""))).toLowerCase();
      if (
        msg.includes("unload is not a function") ||
        msg.includes(".unload is not a function") ||
        msg.includes("pause is not a function") ||
        msg.includes("has already been declared")
      ) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    },
    true,
  );
}

/**
 * React `dangerouslySetInnerHTML` does not execute `<script>` tags. Theme markup relies on
 * jQuery and asset bundles — re-insert scripts after hydration.
 *
 * **React 19 `protect`:** Inert `<script>` nodes inside the React-managed HTML subtree are sealed.
 * **`insertBefore` / mutating those nodes** (type, textContent, attributes) can throw
 * `Cannot assign to read only property 'protect'`.
 *
 * **Approach:** Append **external** and **inline** clones to **`document.head`** only (never insert
 * beside the inert node). For inline execution, listen on `window` **capture** `"error"` and call
 * **`preventDefault`** only for benign double-run / `protect` failures so Next does not treat them
 * as uncaught `pageerror`. Track handled inert nodes in a **`WeakSet`** (per Liquid fingerprint).
 * Deduplicate external `src` and normalized inline bodies.
 *
 * Order is preserved by awaiting each external script and each inline block in DOM walk order.
 */
export function StorefrontLiquidScriptActivator({
  headRemainderSelector,
  rootSelector,
  fingerprint,
}: {
  headRemainderSelector?: string;
  rootSelector: string;
  fingerprint: string;
}) {
  const activationChainRef = React.useRef<Promise<unknown>>(Promise.resolve());

  React.useLayoutEffect(() => {
    let cancelled = false;
    const bucket = getLiquidDedupBucket(fingerprint);

    const collectScripts = (): HTMLScriptElement[] => {
      const out: HTMLScriptElement[] = [];
      if (headRemainderSelector) {
        const headHost = document.querySelector(headRemainderSelector);
        if (headHost) out.push(...Array.from(headHost.querySelectorAll("script")));
      }
      const root = document.querySelector(rootSelector);
      if (root) out.push(...Array.from(root.querySelectorAll("script")));
      return out;
    };

    const markInertSeen = (old: HTMLScriptElement) => {
      bucket.inertHandled.add(old);
    };

    const insertLiveInHead = (s: HTMLScriptElement) => {
      appendThemeScriptToDom(s);
    };

    const dispatchShopifySectionLoad = () => {
      const root = document.querySelector(rootSelector);
      if (!root) return;
      const nodes = root.querySelectorAll("[id^='shopify-section-'], .shopify-section");
      const seen = new Set<Element>();
      for (const section of nodes) {
        if (seen.has(section)) continue;
        seen.add(section);
        const id = section.id?.startsWith("shopify-section-")
          ? section.id.slice("shopify-section-".length)
          : (section.getAttribute("data-section-id") ?? "");
        if (!id) continue;
        try {
          document.dispatchEvent(
            new CustomEvent("shopify:section:load", {
              bubbles: true,
              cancelable: true,
              detail: { sectionId: id, section },
            }),
          );
        } catch {
          /* ignore */
        }
      }
    };

    const runAfterJQueryReady = (fn: () => void) => {
      const w = window as Window & { jQuery?: (sel: unknown) => { ready: (cb: () => void) => unknown } };
      const $ = w.jQuery;
      if ($) {
        $(document).ready(fn);
        return;
      }
      queueMicrotask(fn);
    };

    const tryFlexsliderResize = () => {
      const w = window as Window & {
        jQuery?: (sel: string) => { data: (k: string) => { resize?: () => void } | undefined };
      };
      const $ = w.jQuery;
      if (!$) return;
      try {
        const inst = $("#home-slider").data("flexslider") as { resize?: () => void } | undefined;
        inst?.resize?.();
      } catch (e) {
        console.warn("[StorefrontLiquidScriptActivator] flexslider resize skipped:", e);
      }
    };

    const activateScripts = async () => {
      promoteDeclarativeShadowRootsFrom(document);
      applyTabsElementIndicatorPrototypeShim();
      const scripts = collectScripts();
      for (const old of scripts) {
        if (cancelled) return;
        if (bucket.inertHandled.has(old)) continue;

        const src = old.getAttribute("src")?.trim();
        if (src) {
          if (shouldSkipThemeScriptSrc(src)) {
            markInertSeen(old);
            continue;
          }
          const normSrc = normalizeScriptSrcForDedup(src);
          const globalSrc = getExecutedScriptSrcs();
          if (globalSrc.has(normSrc) || bucket.externalSrc.has(normSrc)) {
            markInertSeen(old);
            continue;
          }
          if (themeBundleGlobalsAlreadyPresent(normSrc)) {
            globalSrc.add(normSrc);
            bucket.externalSrc.add(normSrc);
            markInertSeen(old);
            if (isThemeJsScriptSrc(src)) applyTabsElementIndicatorPrototypeShim();
            continue;
          }
          globalSrc.add(normSrc);
          bucket.externalSrc.add(normSrc);
          await new Promise<void>((resolve) => {
            const s = document.createElement("script");
            for (const attr of Array.from(old.attributes)) {
              if (attr.name.toLowerCase() === "src") continue;
              if (attr.name === ACTIVATED_ATTR) continue;
              s.setAttribute(attr.name, attr.value);
            }
            s.src = src;
            s.setAttribute(ACTIVATED_ATTR, fingerprint);
            let settled = false;
            const done = () => {
              if (settled) return;
              settled = true;
              resolve();
            };
            s.onload = () => {
              try {
                if (isThemeJsScriptSrc(src)) applyTabsElementIndicatorPrototypeShim();
              } finally {
                done();
              }
            };
            s.onerror = () => done();
            if (cancelled) {
              globalSrc.delete(normSrc);
              bucket.externalSrc.delete(normSrc);
              done();
              return;
            }
            try {
              insertLiveInHead(s);
              markInertSeen(old);
            } catch (e) {
              globalSrc.delete(normSrc);
              bucket.externalSrc.delete(normSrc);
              console.warn("[StorefrontLiquidScriptActivator] external script insert failed:", e);
              done();
              return;
            }
          });
        } else {
          if (cancelled) return;
          const code = old.textContent ?? "";
          if (!code.trim()) {
            markInertSeen(old);
            continue;
          }
          const execMode = inlineScriptExecMode(old);
          if (execMode === "skip") {
            markInertSeen(old);
            continue;
          }
          const hash = djb2Hash(normalizeInlineForDedup(code));
          const globalInline = getExecutedInlineHashes();
          if (globalInline.has(hash) || bucket.inlineHash.has(hash)) {
            markInertSeen(old);
            continue;
          }
          const attrs = Array.from(old.attributes).filter((a) => a.name !== ACTIVATED_ATTR);
          await new Promise<void>((resolve) => {
            const run = () => {
              if (cancelled) {
                resolve();
                return;
              }
              const finishOk = () => {
                globalInline.add(hash);
                bucket.inlineHash.add(hash);
                markInertSeen(old);
              };
              const handleInlineError = (e: unknown) => {
                if (isBenignInlineActivationError(e)) {
                  finishOk();
                } else {
                  console.warn("[StorefrontLiquidScriptActivator] inline theme script failed:", e);
                }
              };
              const s = document.createElement("script");
              for (const attr of attrs) {
                s.setAttribute(attr.name, attr.value);
              }
              s.textContent = code;
              s.setAttribute(ACTIVATED_ATTR, fingerprint);
              try {
                const trap = appendInlineScriptWithBenignErrorTrap(() => insertLiveInHead(s));
                if (trap === "ok" || trap === "benign") {
                  finishOk();
                } else if (trap === "error") {
                  markInertSeen(old);
                }
              } catch (e) {
                handleInlineError(e);
              }
              resolve();
            };
            queueMicrotask(run);
          });
        }
      }
      applyTabsElementIndicatorPrototypeShim();
    };

    const prev = activationChainRef.current;
    activationChainRef.current = prev
      .then(async () => {
        if (cancelled) return;
        await activateScripts();
        if (cancelled) return;
        applyTabsElementIndicatorPrototypeShim();
        runAfterJQueryReady(() => {
          if (cancelled) return;
          const kick = () => {
            if (cancelled) return;
            dispatchShopifySectionLoad();
            window.dispatchEvent(new Event("resize"));
            tryFlexsliderResize();
            requestAnimationFrame(() => {
              if (cancelled) return;
              tryFlexsliderResize();
              window.dispatchEvent(new Event("resize"));
            });
          };
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(kick, 32);
            });
          });
        });
      })
      .catch((e) => {
        console.warn("[StorefrontLiquidScriptActivator] activation failed:", e);
      });

    return () => {
      cancelled = true;
    };
  }, [headRemainderSelector, rootSelector, fingerprint]);

  return null;
}

if (typeof window !== "undefined") {
  ensurePfTabsElementUnloadPatch();
  ensureThemeRuntimeNoiseSuppressed();
  ensureInlineScriptBenignErrorHook();
}
