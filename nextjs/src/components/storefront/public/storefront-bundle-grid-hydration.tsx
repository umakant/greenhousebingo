"use client";

import { useLayoutEffect, useRef } from "react";

import { PF_STOREFRONT_CART_SYNC_EVENT } from "@/components/storefront/public/storefront-liquid-cart-sync";

type BundleHydrateProduct = {
  id: string;
  name: string;
  slug: string | null;
  image: string | null;
  price: number;
  variants: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
    themeJson: Record<string, unknown>;
  }>;
};

function productPath(slug: string | null, id: string): string {
  const base = typeof window !== "undefined" && window.location.pathname.startsWith("/shop") ? "/shop/products/" : "/products/";
  const seg = slug?.trim() ? encodeURIComponent(slug.trim()) : encodeURIComponent(id);
  return base + seg;
}

const BUNDLE_HYDRATION_STYLE_ID = "pf-storefront-bundle-hydration";

/** Hide demo color / variant UI on bundle cards; keep Add to bundle visible after JSON patch. */
function ensureBundleHydrationStyles(): void {
  if (document.getElementById(BUNDLE_HYDRATION_STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = BUNDLE_HYDRATION_STYLE_ID;
  s.textContent = `
    .product-bundle-wrapper .product-card variant-picker {
      display: none !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      border: 0 !important;
      visibility: hidden !important;
    }
    .product-bundle-wrapper .product-card .product-card__variants {
      margin-top: 0 !important;
    }
    .product-bundle-wrapper .card.product-card[data-pf-bundle-pdp] {
      cursor: pointer;
    }
    .product-bundle-wrapper .product-card .buy-buttons .product-form__submit,
    .product-bundle-wrapper .product-card .product-form__submit {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(s);
}

function findBundleSection(): Element | null {
  return (
    document.querySelector('[id^="shopify-section-"][id$="__product-bundle"]') ?? document.querySelector(".product-bundle-wrapper")
  );
}

function findBundleMotionList(section: Element): Element | null {
  return (
    section.querySelector("motion-list.product-grid") ??
    section.querySelector("motion-list.card-grid") ??
    section.querySelector(".product-grid")
  );
}

function queryBundleProductCards(ml: Element): HTMLElement[] {
  const direct = ml.querySelectorAll(":scope > .card.product-card");
  if (direct.length) return [...direct].filter((n): n is HTMLElement => n instanceof HTMLElement);
  const nested = ml.querySelectorAll(".card.product-card");
  return [...nested].filter((n): n is HTMLElement => n instanceof HTMLElement);
}

/** Product-card row order aligns with sidebar lines when `.product` is unset (SSR bundle patch). */
function bundleGridCardsFromWrapper(bundleEl: Element): HTMLElement[] {
  const wrap = bundleEl.closest(".product-bundle-wrapper");
  if (!wrap) return [];
  const ml =
    wrap.querySelector("motion-list.product-grid") ??
    wrap.querySelector("motion-list.card-grid") ??
    wrap.querySelector(".product-grid");
  return ml ? queryBundleProductCards(ml) : [];
}

function readInitialBundleCatalogFromDom(): BundleHydrateProduct[] {
  const el = document.getElementById("pf-bundle-catalog-initial");
  const raw = el?.textContent?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed as BundleHydrateProduct[];
  } catch {
    return [];
  }
}

async function fetchBundleCatalogProducts(): Promise<BundleHydrateProduct[]> {
  const initial = readInitialBundleCatalogFromDom();
  if (initial.length > 0) return initial;
  try {
    const res = await fetch("/api/storefront/public/catalog/bundle-products", { credentials: "same-origin" });
    if (!res.ok) return [];
    const data = (await res.json()) as { ok?: boolean; products?: BundleHydrateProduct[] };
    if (!data.ok || !data.products?.length) return [];
    return data.products;
  } catch {
    return [];
  }
}

function applyBundleCardImageUrls(card: HTMLElement, url: string): void {
  const imgs = card.querySelectorAll(".product-card__media img");
  for (const n of imgs) {
    if (!(n instanceof HTMLImageElement)) continue;
    n.src = url;
    n.removeAttribute("srcset");
    if (n.alt?.startsWith("#color_")) n.alt = "";
  }
}

function patchBundleProductCards(cards: HTMLElement[], products: BundleHydrateProduct[]): void {
  cards.forEach((card, i) => {
    const p = products[i];
    if (!p) {
      card.style.display = "none";
      return;
    }
    card.style.display = "";
    card.dataset.pfProductId = p.id;

    const url = p.image?.trim() || "";
    if (url) applyBundleCardImageUrls(card, url);

    const pdpUrl = productPath(p.slug, p.id);
    card.dataset.pfBundlePdp = pdpUrl;

    const title =
      card.querySelector("[data-product-bundle-title]") ?? card.querySelector("a.product-card__title") ?? card.querySelector(".product-card__title");
    if (title) {
      title.textContent = p.name;
      if (title instanceof HTMLAnchorElement) title.href = pdpUrl;
      if (!title.hasAttribute("data-product-bundle-title")) title.setAttribute("data-product-bundle-title", "");
    }

    const mediaA = card.querySelector(
      ".product-card__media a.media--square, .product-card__media a.block.relative.media, .product-card__media a[href]",
    );
    if (mediaA instanceof HTMLAnchorElement) {
      const h = (mediaA.getAttribute("href") ?? "").trim();
      if (!h || h === "#" || h.startsWith("#")) mediaA.href = pdpUrl;
    }

    const priceEl = card.querySelector(".price__regular");
    if (priceEl) priceEl.textContent = `$${p.price.toFixed(2)}`;

    const form = card.querySelector('form[is="product-bundle-form"], form.product-form');
    if (form instanceof HTMLFormElement) {
      form.setAttribute("data-product-title", p.name);
      form.setAttribute("data-pf-product-id", p.id);
      if (p.image?.trim()) form.setAttribute("data-product-image", p.image.trim());
    }

    const themeList = p.variants.map((v) => v.themeJson);
    const selScript = card.querySelector("script[data-selected-variant]");
    const varScript = card.querySelector("script[data-variants]");
    if (selScript && themeList[0]) selScript.textContent = JSON.stringify(themeList[0]);
    if (varScript) varScript.textContent = JSON.stringify(themeList);

    const firstId = p.variants[0] ? String(p.variants[0].id) : "";
    const hid =
      form instanceof HTMLFormElement ? (form.querySelector('input[name="id"]') ?? card.querySelector('input[name="id"]')) : null;
    if (hid instanceof HTMLInputElement && firstId) hid.value = firstId;

    const variantSelect =
      form instanceof HTMLFormElement ? form.querySelector('select[name="id"]') : card.querySelector('select[name="id"]');
    if (variantSelect instanceof HTMLSelectElement) {
      variantSelect.innerHTML = "";
      for (const v of p.variants) {
        const o = document.createElement("option");
        o.value = String(v.id);
        o.textContent = `${v.name} — $${v.price.toFixed(2)}`;
        variantSelect.appendChild(o);
      }
      if (firstId) {
        variantSelect.value = firstId;
        variantSelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  });
}

async function hydrateBundleGrid(): Promise<void> {
  ensureBundleHydrationStyles();

  const products = await fetchBundleCatalogProducts();
  if (products.length === 0) return;

  const delaysMs = [0, 150, 450, 1100, 2400];
  for (let i = 0; i < delaysMs.length; i++) {
    if (delaysMs[i]! > 0) await new Promise((r) => setTimeout(r, delaysMs[i]));

    const section = findBundleSection();
    if (!section) continue;
    const ml = findBundleMotionList(section);
    if (!ml) continue;
    const cards = queryBundleProductCards(ml);
    if (!cards.length) continue;

    patchBundleProductCards(cards, products);
    return;
  }
}

function resolvePaperFlightProductFormProductId(form: HTMLFormElement): string | undefined {
  const onForm = form.getAttribute("data-pf-product-id")?.trim();
  if (onForm) return onForm;
  const enclosing = form.closest("product-info");
  const pid = enclosing?.getAttribute("data-pf-product-id")?.trim();
  if (pid) return pid;
  const fp = form.closest(".featured-product");
  const first = fp?.querySelector("product-info");
  return first?.getAttribute("data-pf-product-id")?.trim() || undefined;
}

function isPaperFlightProductCartForm(form: HTMLFormElement): boolean {
  /** Bundle grid cards reuse `product-form` + `add-to-cart-form`; only the real PDP `product-form` is ours. */
  if (form.getAttribute("is") === "product-bundle-form") return false;
  if (form.getAttribute("data-type") !== "add-to-cart-form") return false;
  if (form.getAttribute("is") === "product-form") return true;
  return form.classList.contains("product-form");
}

function dispatchPaperFlightCartSync(opts?: { openDrawer?: boolean }): void {
  window.dispatchEvent(
    new CustomEvent(PF_STOREFRONT_CART_SYNC_EVENT, {
      bubbles: true,
      detail: opts?.openDrawer ? { openDrawer: true } : {},
    }),
  );
}

/** POST `/api/storefront/public/cart` returns `{ ok: boolean }`; treat body `ok` as source of truth when HTTP is 200. */
async function isPublicCartPostSuccess(res: Response): Promise<boolean> {
  if (!res.ok) return false;
  try {
    const data = (await res.json()) as { ok?: unknown };
    return data.ok === true;
  } catch {
    return false;
  }
}

function clearProductBundleSubmitInlineOverrides(btn: HTMLElement): void {
  for (const sel of [".btn-text", ".btn-loader", ".flex.gap-3d5"] as const) {
    for (const n of btn.querySelectorAll(sel)) {
      if (n instanceof HTMLElement) {
        n.style.removeProperty("opacity");
        n.style.removeProperty("visibility");
      }
    }
  }
}

/**
 * Theme `hover-button` ties `aria-busy` to Motion opacity on `.btn-text`. We intercept bundle clicks at
 * `document` capture (so `ProductBundle` never runs), but we still toggle busy — timelines can leave the
 * label at opacity 0. Force the default label + visible state after cart sync.
 */
function restoreProductBundleSubmitAppearance(btn: HTMLElement): void {
  for (const n of btn.querySelectorAll(".btn-text")) {
    if (!(n instanceof HTMLElement)) continue;
    if (!n.textContent?.trim()) {
      n.textContent = "Add to cart";
    }
    n.style.setProperty("opacity", "1", "important");
    n.style.setProperty("visibility", "visible", "important");
  }
  const flexWrap = btn.querySelector(".flex.gap-3d5");
  if (flexWrap instanceof HTMLElement) {
    flexWrap.style.setProperty("opacity", "1", "important");
    flexWrap.style.setProperty("visibility", "visible", "important");
  }
  const loader = btn.querySelector(".btn-loader");
  if (loader instanceof HTMLElement) {
    loader.style.setProperty("opacity", "0", "important");
    loader.style.setProperty("visibility", "hidden", "important");
  }
}

function flashProductAddedButton(btn: HTMLButtonElement): void {
  const holder = btn.querySelector(".btn-text");
  if (!holder) return;
  const prev = holder.innerHTML;
  holder.innerHTML = "<span>Added to cart</span>";
  window.setTimeout(() => {
    holder.innerHTML = prev;
  }, 2400);
}

function isPrimaryAddToCartButton(btn: HTMLButtonElement): boolean {
  if (btn.getAttribute("name") !== "add") return false;
  const ty = btn.getAttribute("type");
  if (ty === "button") return false;
  return ty === "submit" || ty === null || ty === "";
}

function clearLiquidProductFormSubmitBusy(form: HTMLFormElement): void {
  queueMicrotask(() => {
    form.querySelectorAll(`button[is="hover-button"][type="submit"]`).forEach((b) => {
      if (b instanceof HTMLButtonElement) b.removeAttribute("aria-busy");
    });
  });
}

async function postPaperFlightLiquidProductFormToCart(form: HTMLFormElement): Promise<boolean> {
  const pid = resolvePaperFlightProductFormProductId(form);
  if (!pid) return false;
  const hid = form.querySelector('input[name="id"]');
  const vk = hid instanceof HTMLInputElement ? hid.value : "";
  const qtyInput = form.querySelector("quantity-input input, input.quantity__input, input[name='quantity']");
  const qty = qtyInput instanceof HTMLInputElement ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;

  const res = await fetch("/api/storefront/public/cart", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: pid, variantKey: vk, quantity: qty }),
  });
  return isPublicCartPostSuccess(res);
}

function resolveProductFormFromAddButton(btn: HTMLButtonElement): HTMLFormElement | null {
  if (btn.form instanceof HTMLFormElement) return btn.form;
  const fid = btn.getAttribute("form");
  if (fid) {
    const el = document.getElementById(fid);
    if (el instanceof HTMLFormElement) return el;
  }
  return btn.closest("form");
}

/** Theme product forms POST to Shopify `cart/add.js`; route Add to cart to Paper Flight when we know the catalog id. */
function installPaperFlightLiquidProductFormCartBridge(): void {
  const w = window as Window & { __pfLiquidProductFormCart?: boolean };
  if (w.__pfLiquidProductFormCart) return;
  w.__pfLiquidProductFormCart = true;

  /**
   * Concept / ThemeForest `product-form` often handles the primary CTA on `click` and never surfaces
   * a normal `submit` event we can intercept. Capture the add button and POST to Paper Flight first.
   *
   * Use `pf:cart:sync` — not `cart:refresh`. The theme’s `cart-drawer` listens for `cart:refresh` and
   * refetches `/?section_id=…`, wiping our patched mini-cart markup.
   */
  document.addEventListener(
    "click",
    (ev) => {
      const t = ev.target as HTMLElement | null;
      const btn = t?.closest("button.product-form__submit");
      if (!(btn instanceof HTMLButtonElement)) return;
      if (!isPrimaryAddToCartButton(btn)) return;

      const form = resolveProductFormFromAddButton(btn);
      if (!form || !isPaperFlightProductCartForm(form)) return;

      const pid = resolvePaperFlightProductFormProductId(form);

      ev.preventDefault();
      ev.stopImmediatePropagation();

      if (!pid) {
        return;
      }

      btn.setAttribute("aria-busy", "true");
      btn.disabled = true;

      void (async () => {
        try {
          const ok = await postPaperFlightLiquidProductFormToCart(form);
          if (ok) {
            flashProductAddedButton(btn);
            dispatchPaperFlightCartSync({ openDrawer: true });
          }
        } finally {
          btn.removeAttribute("aria-busy");
          btn.disabled = false;
          queueMicrotask(() => clearLiquidProductFormSubmitBusy(form));
        }
      })();
    },
    true,
  );

  document.addEventListener(
    "submit",
    (ev) => {
      const form = ev.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!isPaperFlightProductCartForm(form)) return;

      const pid = resolvePaperFlightProductFormProductId(form);
      if (!pid) {
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }

      ev.preventDefault();
      ev.stopPropagation();

      const submitBtn = form.querySelector('button[name="add"].product-form__submit');
      const btn = submitBtn instanceof HTMLButtonElement ? submitBtn : null;
      if (btn) {
        btn.setAttribute("aria-busy", "true");
        btn.disabled = true;
      }

      void (async () => {
        try {
          const ok = await postPaperFlightLiquidProductFormToCart(form);
          if (ok) {
            if (btn) flashProductAddedButton(btn);
            dispatchPaperFlightCartSync({ openDrawer: true });
          }
        } finally {
          if (btn) {
            btn.removeAttribute("aria-busy");
            btn.disabled = false;
          }
          queueMicrotask(() => clearLiquidProductFormSubmitBusy(form));
        }
      })();
    },
    true,
  );
}

function resolveBundleSlotProductId(slot: HTMLElement, gridCards: HTMLElement[], variantKey: string): string | undefined {
  const el = slot as HTMLElement & { product?: HTMLElement };
  const prod = el.product;
  if (prod instanceof HTMLElement) {
    const direct = prod.dataset?.pfProductId?.trim();
    if (direct) return direct;
    const card = prod.closest(".card.product-card");
    if (card instanceof HTMLElement) {
      const fromCard = card.dataset?.pfProductId?.trim();
      if (fromCard) return fromCard;
    }
    const fromForm = prod.closest('form[is="product-bundle-form"]');
    if (fromForm instanceof HTMLFormElement) {
      const fid = fromForm.getAttribute("data-pf-product-id")?.trim();
      if (fid) return fid;
    }
  }
  const vk = variantKey.trim();
  if (!vk) return undefined;
  for (const card of gridCards) {
    const input = card.querySelector('form[is="product-bundle-form"] input[name="id"]');
    if (input instanceof HTMLInputElement && input.value === vk) {
      const pid = card.dataset?.pfProductId?.trim();
      if (pid) return pid;
    }
  }
  return undefined;
}

function installProductBundleCardPdpNavigation(): void {
  const w = window as Window & { __pfBundleCardPdpNav?: boolean };
  if (w.__pfBundleCardPdpNav) return;
  w.__pfBundleCardPdpNav = true;

  document.addEventListener(
    "click",
    (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement)) return;
      const card = t.closest(".product-bundle-wrapper .card.product-card");
      if (!(card instanceof HTMLElement)) return;
      const dest = card.dataset.pfBundlePdp?.trim();
      if (!dest) return;

      if (t.closest("button")) return;
      if (t.closest("input") || t.closest("select") || t.closest("textarea")) return;

      const a = t.closest("a");
      if (a instanceof HTMLAnchorElement) {
        const h = (a.getAttribute("href") ?? "").trim();
        if (h && h !== "#" && !h.startsWith("#")) return;
      }

      ev.preventDefault();
      ev.stopPropagation();
      window.location.assign(dest);
    },
    true,
  );
}

function installPaperFlightBundleCartBridge(): void {
  const w = window as Window & { __pfBundleCartBridge?: boolean };
  if (w.__pfBundleCartBridge) return;
  w.__pfBundleCartBridge = true;

  /**
   * `is="hover-button"` sets `aria-busy` on submit *after* `ProductBundleForm` clears it.
   * Run after handlers on the same form so the spinner does not stick on “Add to bundle” cards.
   */
  document.addEventListener(
    "submit",
    (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLFormElement)) return;
      if (target.getAttribute("is") !== "product-bundle-form") return;
      queueMicrotask(() => {
        const submitBtns = target.querySelectorAll(`button[is="hover-button"][type="submit"]`);
        submitBtns.forEach((b) => {
          if (b instanceof HTMLButtonElement) b.removeAttribute("aria-busy");
        });
      });
    },
    false,
  );

  document.addEventListener(
    "click",
    async (ev) => {
      const t = ev.target as HTMLElement | null;
      const btn = t?.closest("[data-product-bundle-submit]");
      if (!btn || !btn.closest("product-bundle")) return;

      const bundle = btn.closest("product-bundle");
      if (!bundle || !(btn instanceof HTMLElement)) return;

      ev.preventDefault();
      /**
       * `stopImmediatePropagation` only blocks other listeners on `document`; the theme’s listener
       * on the button still runs and POSTs to Shopify `cart/add.js`. We must halt propagation so
       * `ProductBundle` never hits the bogus fetch.
       */
      ev.stopPropagation();

      clearProductBundleSubmitInlineOverrides(btn);
      btn.setAttribute("aria-busy", "true");
      btn.setAttribute("aria-disabled", "true");

      const gridCards = bundleGridCardsFromWrapper(bundle);
      let anyCartPostOk = false;

      try {
        /* Filled lines get `data-variant-id` and lose `available`; empty placeholders keep `available=""`. */
        const slots = [...bundle.querySelectorAll("[data-product-bundle-variant]")].filter((n): n is HTMLElement => {
          if (!(n instanceof HTMLElement)) return false;
          return Boolean(n.getAttribute("data-variant-id")?.trim());
        });
        for (const slot of slots) {
          const vk = slot.getAttribute("data-variant-id") ?? "";
          const pid = resolveBundleSlotProductId(slot, gridCards, vk);
          const qInput = slot.querySelector("quantity-input input, input.quantity__input");
          const qty = qInput instanceof HTMLInputElement ? Math.max(1, parseInt(qInput.value, 10) || 1) : 1;
          if (!pid) continue;
          const res = await fetch("/api/storefront/public/cart", {
            method: "POST",
            credentials: "include",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ productId: pid, variantKey: vk, quantity: qty }),
          });
          if (await isPublicCartPostSuccess(res)) anyCartPostOk = true;
        }
      } finally {
        btn.removeAttribute("aria-busy");
        btn.removeAttribute("aria-disabled");
        restoreProductBundleSubmitAppearance(btn);
        queueMicrotask(() => restoreProductBundleSubmitAppearance(btn));
        window.setTimeout(() => restoreProductBundleSubmitAppearance(btn), 200);
      }

      dispatchPaperFlightCartSync(anyCartPostOk ? { openDrawer: true } : undefined);
    },
    true,
  );
}

/**
 * After the Concept theme loads the bundle section, replace demo catalog markup with live bundle
 * products from merchant settings and route “Add to cart” on the bundle sidebar to Paper Flight cart lines.
 */
export function StorefrontBundleGridHydration() {
  const ran = useRef(false);

  useLayoutEffect(() => {
    if (ran.current) return;
    ran.current = true;

    installPaperFlightLiquidProductFormCartBridge();
    installPaperFlightBundleCartBridge();
    installProductBundleCardPdpNavigation();

    const start = () => {
      void hydrateBundleGrid();
    };

    if (document.readyState === "complete") {
      window.setTimeout(start, 80);
    } else {
      window.addEventListener("load", () => window.setTimeout(start, 80), { once: true });
    }
  }, []);

  return null;
}
