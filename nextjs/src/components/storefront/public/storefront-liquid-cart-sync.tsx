"use client";

import { useEffect } from "react";

/**
 * Headless cart DOM sync for Liquid themes. Avoid dispatching `cart:refresh` yourself — the theme’s
 * `cart-drawer` listens and refetches `/?section_id=…`, replacing mini-cart markup (often empty off Shopify).
 * We listen for that event and re-apply lines from `/api/storefront/public/cart` after the DOM swap.
 */
export const PF_STOREFRONT_CART_SYNC_EVENT = "pf:cart:sync";

/** Set while we mutate the cart drawer so `MutationObserver` does not re-enter sync in a loop. */
let cartDrawerDomObserver: MutationObserver | null = null;

type ApiLine = {
  id: string;
  quantity: number;
  unitPrice: number;
  product: { id: string; name: string; slug: string | null; image: string | null; stock?: number } | null;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

type PublicCollectionRow = {
  title: string;
  slug: string;
  featuredImageUrl: string | null;
};

const EMPTY_CART_COLLECTIONS_ARROW = `<svg class="icon icon-arrow-right icon-sm transform" viewBox="0 0 21 20" stroke="currentColor" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10H18M18 10L12.1667 4.16675M18 10L12.1667 15.8334"></path></svg>`;

/** Successful fetch only; `undefined` means not cached yet (network/errors may retry). */
let cachedPublicCollections: PublicCollectionRow[] | undefined;
let publicCollectionsInFlight: Promise<PublicCollectionRow[]> | null = null;

function loadPublicCollectionsOnce(): Promise<PublicCollectionRow[]> {
  if (cachedPublicCollections !== undefined) return Promise.resolve(cachedPublicCollections);
  if (publicCollectionsInFlight) return publicCollectionsInFlight;
  publicCollectionsInFlight = (async () => {
    try {
      const res = await fetch("/api/storefront/public/collections", { credentials: "include" });
      const data = (await res.json()) as {
        ok?: boolean;
        collections?: Array<{ title?: string; slug?: string; featuredImageUrl?: string | null }>;
      };
      if (!res.ok || !data?.ok || !Array.isArray(data.collections)) return [];
      const rows = data.collections
        .map((c) => ({
          title: String(c.title ?? "").trim(),
          slug: String(c.slug ?? "").trim().toLowerCase(),
          featuredImageUrl: typeof c.featuredImageUrl === "string" ? c.featuredImageUrl : null,
        }))
        .filter((c) => c.title.length > 0 && c.slug.length > 0);
      cachedPublicCollections = rows;
      return rows;
    } catch {
      return [];
    } finally {
      publicCollectionsInFlight = null;
    }
  })();
  return publicCollectionsInFlight;
}

/** Some theme variants drop `ul.drawer__empty-collections`; create it under `.drawer__empty`. */
function ensureEmptyCartCollectionsList(panel: Element): HTMLUListElement | null {
  const existing = panel.querySelector("ul.drawer__empty-collections");
  if (existing instanceof HTMLUListElement) return existing;
  const emptyRoot = panel.querySelector(".drawer__empty");
  if (!(emptyRoot instanceof HTMLElement)) return null;
  const ul = document.createElement("ul");
  ul.className = "drawer__empty-collections grid gap-3";
  const msg = emptyRoot.querySelector(".drawer__empty-message");
  if (msg instanceof HTMLElement) msg.after(ul);
  else emptyRoot.appendChild(ul);
  return ul;
}

/** Replace theme demo “Headphones / …” links with this store’s published collections. */
function patchEmptyCartCollectionLinks(panel: Element, collections: PublicCollectionRow[]): void {
  const list = ensureEmptyCartCollectionsList(panel);
  if (!list) return;
  if (collections.length === 0) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = collections
    .slice(0, 12)
    .map((c) => {
      const href = `/shop/collections/${encodeURIComponent(c.slug)}`;
      const title = escapeHtml(c.title);
      const img = c.featuredImageUrl?.trim()
        ? `<img src="${escapeHtml(c.featuredImageUrl.trim())}" alt="" width="35" height="35" loading="lazy" class="rounded object-cover shrink-0" />`
        : `<span class="inline-block h-9 w-9 shrink-0 rounded-md bg-current/10" aria-hidden="true"></span>`;
      return `<li><a class="flex items-center justify-between gap-3" href="${href}"><span class="flex min-w-0 items-center gap-3">${img}<span class="truncate font-medium text-left">${title}</span></span>${EMPTY_CART_COLLECTIONS_ARROW}</a></li>`;
    })
    .join("");
}

async function fetchPublicCart(): Promise<{ lines: ApiLine[]; subtotal: number } | null> {
  try {
    const res = await fetch("/api/storefront/public/cart", { credentials: "include" });
    const data = (await res.json()) as { ok?: boolean; cart?: { lines: ApiLine[]; subtotal?: number } };
    if (!data?.ok || !data.cart) return null;
    return {
      lines: Array.isArray(data.cart.lines) ? data.cart.lines : [],
      subtotal: typeof data.cart.subtotal === "number" ? data.cart.subtotal : 0,
    };
  } catch {
    return null;
  }
}

function setCartCountBadges(totalQty: number): void {
  for (const el of document.querySelectorAll("cart-count")) {
    el.textContent = String(totalQty);
    el.setAttribute("aria-label", `${totalQty} item${totalQty === 1 ? "" : "s"}`);
    if (totalQty > 0) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }
}

function renderLineHtml(l: ApiLine): string {
  const name = escapeHtml(l.product?.name?.trim() || "Item");
  const lineIdAttr = escapeHtml(l.id);
  const qty = l.quantity;
  const each = l.unitPrice;
  const lineTotal = qty * each;
  const stock = typeof l.product?.stock === "number" && Number.isFinite(l.product.stock) ? l.product.stock : null;
  const atMax = stock != null && qty >= stock;
  const plusDisabled = atMax ? " disabled aria-disabled=\"true\"" : "";
  const img = l.product?.image?.trim();
  const imgTag = img
    ? `<img src="${escapeHtml(img)}" alt="" width="64" height="64" loading="lazy" class="rounded aspect-square object-cover w-14 h-14 shrink-0"/>`
    : `<span class="w-14 h-14 shrink-0 rounded bg-black/5 block"></span>`;
  return `<li class="horizontal-product grid grid-cols-[auto_1fr_auto] gap-3 items-start py-3 border-b border-current/10" role="listitem" data-pf-cart-line="${lineIdAttr}">
    ${imgTag}
    <div class="min-w-0 text-left">
      <p class="font-medium leading-tight">${name}</p>
      <p class="text-sm text-opacity leading-tight mt-1">$${each.toFixed(2)} each</p>
      <div class="flex items-center gap-2 mt-2" data-pf-cart-qty-row>
        <button type="button" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-current/20 text-lg leading-none hover:bg-black/5" data-pf-cart-qty-delta="-1" data-pf-cart-line-id="${lineIdAttr}" aria-label="Decrease quantity">−</button>
        <span class="min-w-8 text-center tabular-nums text-sm font-medium" data-pf-line-qty>${qty}</span>
        <button type="button" class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-current/20 text-lg leading-none hover:bg-black/5 disabled:opacity-40 disabled:pointer-events-none"${plusDisabled} data-pf-cart-qty-delta="1" data-pf-cart-line-id="${lineIdAttr}" aria-label="Increase quantity">+</button>
      </div>
    </div>
    <span class="font-medium whitespace-nowrap self-start">$${lineTotal.toFixed(2)}</span>
  </li>`;
}

async function patchCartLineQuantity(lineId: string, quantity: number): Promise<boolean> {
  const res = await fetch("/api/storefront/public/cart", {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lineId, quantity }),
  });
  return res.ok;
}

let miniCartQtyBridgeInstalled = false;

/** Delegated clicks on − / + in patched mini-cart lines; PATCH then re-sync DOM from API. */
function installPaperFlightMiniCartQtyBridge(): void {
  if (miniCartQtyBridgeInstalled) return;
  miniCartQtyBridgeInstalled = true;

  document.addEventListener(
    "click",
    (ev) => {
      const t = ev.target;
      if (!(t instanceof Element)) return;
      const btn = t.closest("[data-pf-cart-qty-delta]");
      if (!(btn instanceof HTMLButtonElement)) return;
      if (!btn.closest("cart-drawer")) return;

      const lineId = btn.getAttribute("data-pf-cart-line-id")?.trim();
      const rawDelta = btn.getAttribute("data-pf-cart-qty-delta");
      const delta = rawDelta != null ? Number(rawDelta) : NaN;
      if (!lineId || !Number.isFinite(delta)) return;

      ev.preventDefault();
      ev.stopPropagation();

      const row = btn.closest("[data-pf-cart-line]");
      const qtyEl = row?.querySelector("[data-pf-line-qty]");
      const current = parseInt(qtyEl?.textContent?.trim() ?? "1", 10);
      const safeCurrent = Number.isFinite(current) && current > 0 ? current : 1;
      const next = Math.max(0, safeCurrent + delta);

      if (btn.disabled) return;

      const controls = row?.querySelectorAll<HTMLButtonElement>("button[data-pf-cart-qty-delta]");
      controls?.forEach((b) => {
        b.disabled = true;
      });

      void (async () => {
        try {
          const ok = await patchCartLineQuantity(lineId, next);
          if (ok) await syncPaperFlightCartIntoLiquidDom();
          else await syncPaperFlightCartIntoLiquidDom();
        } finally {
          controls?.forEach((b) => {
            b.disabled = false;
          });
        }
      })();
    },
    true,
  );
}

function resolveMiniCartPanel(): Element | null {
  const drawer = document.querySelector("cart-drawer.cart-drawer, cart-drawer#CartDrawer, cart-drawer");
  if (drawer) {
    const inside =
      drawer.querySelector("[id^=\"MiniCart-\"].drawer__panel") ?? drawer.querySelector("[id^=\"MiniCart-\"]");
    if (inside) return inside;
  }
  return document.querySelector("[id^=\"MiniCart-\"].drawer__panel") ?? document.querySelector("[id^=\"MiniCart-\"]");
}

/** Theme may omit `h-full` on the flex column wrapper; locate the shell that actually wraps the line list. */
function resolveMiniCartShell(panel: Element): HTMLElement | null {
  const direct =
    panel.querySelector(":scope > .flex.flex-col.h-full") ?? panel.querySelector(":scope > .flex.flex-col");
  if (direct instanceof HTMLElement) return direct;
  const ul =
    panel.querySelector("cart-items ul.horizontal-products") ??
    panel.querySelector("ul.horizontal-products[role=\"list\"]") ??
    panel.querySelector("ul.horizontal-products");
  if (ul instanceof HTMLElement) {
    const fromUl = ul.closest(".flex.flex-col");
    if (fromUl instanceof HTMLElement) return fromUl;
  }
  return null;
}

function findMiniCartLineList(panel: Element, shell: HTMLElement): HTMLUListElement | null {
  const scoped =
    shell.querySelector("cart-items ul.horizontal-products") ??
    shell.querySelector("ul.horizontal-products[role=\"list\"]") ??
    shell.querySelector("ul.horizontal-products");
  if (scoped instanceof HTMLUListElement) return scoped;
  const inPanel =
    panel.querySelector("cart-items ul.horizontal-products[role=\"list\"]") ??
    panel.querySelector("cart-items ul.horizontal-products") ??
    panel.querySelector("ul.horizontal-products[role=\"list\"]");
  return inPanel instanceof HTMLUListElement ? inPanel : null;
}

function resolveEmptyAndItemsScrolls(panel: Element, ul: HTMLElement): {
  emptyScroll: HTMLElement | null;
  itemsScroll: HTMLElement | null;
} {
  const itemsScroll = ul.closest(".drawer__scrollable");
  const emptyRoot = panel.querySelector(".drawer__empty");
  let emptyScroll = emptyRoot?.closest(".drawer__scrollable") ?? null;
  if (emptyScroll && emptyScroll === itemsScroll) emptyScroll = null;
  if (!emptyScroll) {
    const scrolls = [...panel.querySelectorAll(".drawer__scrollable")].filter((n): n is HTMLElement => n instanceof HTMLElement);
    emptyScroll = scrolls.find((s) => s !== itemsScroll && s.querySelector(".drawer__empty")) ?? scrolls.find((s) => s !== itemsScroll) ?? null;
  }
  return {
    emptyScroll: emptyScroll instanceof HTMLElement ? emptyScroll : null,
    itemsScroll: itemsScroll instanceof HTMLElement ? itemsScroll : null,
  };
}

/** When `ul.horizontal-products` is missing (some theme DOM swaps), still locate empty vs line columns. */
function resolveEmptyAndItemsScrollsFallback(panel: Element): {
  emptyScroll: HTMLElement | null;
  itemsScroll: HTMLElement | null;
} {
  const emptyRoot = panel.querySelector(".drawer__empty");
  const emptyScroll = emptyRoot?.closest(".drawer__scrollable");
  const scrolls = [...panel.querySelectorAll(".drawer__scrollable")].filter((n): n is HTMLElement => n instanceof HTMLElement);
  const itemsScroll =
    scrolls.find((s) => s.querySelector("ul.horizontal-products") && !s.querySelector(".drawer__empty")) ?? null;
  return {
    emptyScroll: emptyScroll instanceof HTMLElement ? emptyScroll : null,
    itemsScroll,
  };
}

/** Theme `hidden` + layout classes can keep the empty column visible; force display when we have lines. */
function setMiniCartColumnVisible(el: HTMLElement | null, visible: boolean): void {
  if (!el) return;
  if (visible) {
    el.classList.remove("hidden");
    el.style.removeProperty("display");
  } else {
    el.classList.add("hidden");
    el.style.display = "none";
  }
}

function patchMiniCartDrawer(lines: ApiLine[], subtotal: number): void {
  const panel = resolveMiniCartPanel();
  if (!panel) return;

  if (lines.length === 0) {
    void loadPublicCollectionsOnce().then((cols) => {
      const p = resolveMiniCartPanel();
      if (p) patchEmptyCartCollectionLinks(p, cols);
    });
  }

  const shell = resolveMiniCartShell(panel);
  if (!shell) return;

  const ul = findMiniCartLineList(panel, shell);
  const footerTop = shell.querySelector(".drawer__footer.grid");
  const subtotalEl = shell.querySelector(".totals__subtotal-value");

  if (lines.length === 0) {
    const { emptyScroll, itemsScroll } = ul
      ? resolveEmptyAndItemsScrolls(panel, ul)
      : resolveEmptyAndItemsScrollsFallback(panel);
    setMiniCartColumnVisible(emptyScroll, true);
    setMiniCartColumnVisible(itemsScroll, false);
    footerTop?.classList.add("hidden");
    if (ul) ul.innerHTML = "";
    if (subtotalEl) subtotalEl.textContent = "$0.00 USD";
    return;
  }

  if (!ul) return;

  const { emptyScroll, itemsScroll } = resolveEmptyAndItemsScrolls(panel, ul);

  setMiniCartColumnVisible(emptyScroll, false);
  setMiniCartColumnVisible(itemsScroll, true);
  footerTop?.classList.remove("hidden");
  ul.innerHTML = lines.map(renderLineHtml).join("");
  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)} USD`;
}

/** Theme checkout POSTs nowhere useful; send shoppers to Paper Flight checkout. */
function ensureDrawerCheckoutRedirects(): void {
  const drawer = document.querySelector("cart-drawer");
  if (!drawer || drawer.hasAttribute("data-pf-checkout-redirect")) return;
  drawer.setAttribute("data-pf-checkout-redirect", "");
  drawer.addEventListener(
    "submit",
    (ev) => {
      const form = ev.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.classList.contains("drawer__footer-buttons")) return;
      ev.preventDefault();
      ev.stopPropagation();
      window.location.assign("/shop/checkout");
    },
    true,
  );
}

export async function syncPaperFlightCartIntoLiquidDom(): Promise<void> {
  cartDrawerDomObserver?.disconnect();
  try {
    const data = await fetchPublicCart();
    if (!data) return;
    const totalQty = data.lines.reduce((s, l) => s + Math.max(0, l.quantity), 0);
    setCartCountBadges(totalQty);
    patchMiniCartDrawer(data.lines, data.subtotal);
    ensureDrawerCheckoutRedirects();
  } finally {
    const d = document.querySelector("cart-drawer");
    if (d && cartDrawerDomObserver) {
      cartDrawerDomObserver.observe(d, { childList: true, subtree: true });
    }
  }
}

function scheduleCartDrawerResync(): void {
  /* Theme `cart:refresh` replaces `#MiniCart-*` innerHTML with empty section HTML; re-patch a few times. */
  const delays = [0, 90, 280, 650, 1100, 2000];
  for (const ms of delays) {
    window.setTimeout(() => void syncPaperFlightCartIntoLiquidDom(), ms);
  }
}

function waitCartDrawerDefined(timeoutMs: number): Promise<void> {
  if (customElements.get("cart-drawer")) return Promise.resolve();
  return Promise.race([
    customElements.whenDefined("cart-drawer").then(() => undefined),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

function tryShowCartDrawer(): boolean {
  const drawer = document.querySelector("cart-drawer");
  const show = (drawer as HTMLElement & { show?: (fe?: Element | null, animate?: boolean) => void })?.show;
  if (!drawer || typeof show !== "function") return false;
  try {
    show.call(drawer, null, true);
    return true;
  } catch {
    return false;
  }
}

/** Opens the theme mini-cart drawer after `cart.js` defines `cart-drawer` (its `show` lives on the upgraded class). */
async function openLiquidCartDrawer(): Promise<void> {
  await waitCartDrawerDefined(6000);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  if (tryShowCartDrawer()) return;

  for (let i = 0; i < 40; i += 1) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 50);
    });
    if (tryShowCartDrawer()) return;
  }

  const opener = document.querySelector(".cart-drawer-button[aria-controls=\"CartDrawer\"]");
  if (opener instanceof HTMLElement) opener.click();
}

export function StorefrontLiquidCartSync() {
  useEffect(() => {
    /**
     * Do not gate this effect with a mount-once ref: React Strict Mode runs mount → cleanup → mount.
     * A ref guard would skip the second mount and leave `pf:cart:sync` unsubscribed while bridges still
     * dispatch after add-to-cart (bundle sidebar, Liquid product forms).
     */
    installPaperFlightMiniCartQtyBridge();
    void syncPaperFlightCartIntoLiquidDom();

    const drawer = document.querySelector("cart-drawer");
    /** Browser timers are numeric; avoid `NodeJS.Timeout` from Node typings in client components. */
    let debounceDomSync: number | undefined;
    if (drawer instanceof HTMLElement && !drawer.hasAttribute("data-pf-cart-dom-observer")) {
      drawer.setAttribute("data-pf-cart-dom-observer", "");
      cartDrawerDomObserver = new MutationObserver(() => {
        window.clearTimeout(debounceDomSync);
        debounceDomSync = window.setTimeout(() => void syncPaperFlightCartIntoLiquidDom(), 80);
      });
      cartDrawerDomObserver.observe(drawer, { childList: true, subtree: true });
    }

    const onRefresh = (ev: Event) => {
      const openDrawer =
        ev instanceof CustomEvent &&
        ev.detail &&
        typeof ev.detail === "object" &&
        (ev.detail as { openDrawer?: boolean }).openDrawer === true;

      if (openDrawer) {
        void (async () => {
          await syncPaperFlightCartIntoLiquidDom();
          scheduleCartDrawerResync();
          await openLiquidCartDrawer();
        })();
      } else {
        void syncPaperFlightCartIntoLiquidDom();
        scheduleCartDrawerResync();
      }
    };
    window.addEventListener(PF_STOREFRONT_CART_SYNC_EVENT, onRefresh);

    /**
     * Theme `cart-drawer` listens in bubble phase and replaces `#MiniCart-*` from `/?section_id=…`
     * (Shopify section HTML). That URL is not a real Shopify section on Paper Flight — the fetch
     * returns a full page and wipes the drawer. Stop propagation in capture, then re-sync from our API.
     */
    const onThemeCartRefreshCapture = (ev: Event) => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const openDrawer =
        ev instanceof CustomEvent &&
        ev.detail &&
        typeof ev.detail === "object" &&
        (ev.detail as { open?: boolean }).open === true;
      void (async () => {
        await syncPaperFlightCartIntoLiquidDom();
        scheduleCartDrawerResync();
        if (openDrawer) await openLiquidCartDrawer();
      })();
    };
    document.addEventListener("cart:refresh", onThemeCartRefreshCapture, true);

    return () => {
      window.removeEventListener(PF_STOREFRONT_CART_SYNC_EVENT, onRefresh);
      document.removeEventListener("cart:refresh", onThemeCartRefreshCapture, true);
      cartDrawerDomObserver?.disconnect();
      cartDrawerDomObserver = null;
      window.clearTimeout(debounceDomSync);
      drawer?.removeAttribute("data-pf-cart-dom-observer");
    };
  }, []);

  return null;
}
