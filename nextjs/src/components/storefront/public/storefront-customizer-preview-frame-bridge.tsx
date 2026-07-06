"use client";

import { useEffect } from "react";

export const STOREFRONT_CUSTOMIZER_FRAME_HEIGHT_MESSAGE_TYPE = "PF_STOREFRONT_CUSTOMIZER_FRAME_HEIGHT";

const PREVIEW_STYLE_ID = "pf-customizer-preview-scroll-fix";

function resolveParentOrigin(allowedParentOrigin: string | null): string {
  if (allowedParentOrigin?.trim()) return allowedParentOrigin.trim();
  try {
    const raw = new URLSearchParams(window.location.search).get("pf_msg_parent")?.trim();
    if (raw) return decodeURIComponent(raw);
  } catch {
    /* ignore */
  }
  return window.location.origin;
}

export function measureCustomizerPreviewDocumentHeight(): number {
  const root = document.querySelector(".shopify-liquid-root");
  const docEl = document.documentElement;
  const body = document.body;
  return Math.max(
    root instanceof HTMLElement ? root.scrollHeight : 0,
    root instanceof HTMLElement ? root.offsetHeight : 0,
    body?.scrollHeight ?? 0,
    docEl?.scrollHeight ?? 0,
    docEl?.offsetHeight ?? 0,
  );
}

export function reportCustomizerPreviewFrameHeight(parentOrigin: string) {
  if (window.parent === window) return;
  const height = measureCustomizerPreviewDocumentHeight();
  if (height <= 0) return;
  window.parent.postMessage({ type: STOREFRONT_CUSTOMIZER_FRAME_HEIGHT_MESSAGE_TYPE, height }, parentOrigin);
}

/**
 * When `/shop?pf_preview=…` loads inside the theme customizer iframe:
 * - unlock body scroll (theme scroll-snap / modal locks fight iframe scrolling)
 * - post document height so the parent can size the iframe and scroll the preview pane
 */
export function StorefrontCustomizerPreviewFrameBridge({
  allowedParentOrigin,
}: {
  allowedParentOrigin: string | null;
}) {
  useEffect(() => {
    const parentOrigin = resolveParentOrigin(allowedParentOrigin);
    document.documentElement.setAttribute("data-pf-customizer-preview", "");

    if (!document.getElementById(PREVIEW_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = PREVIEW_STYLE_ID;
      style.textContent = `
        html[data-pf-customizer-preview],
        html[data-pf-customizer-preview] body {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          height: auto !important;
          min-height: 100% !important;
          scroll-snap-type: none !important;
          position: static !important;
        }
        html[data-pf-customizer-preview] body.has-modal-open,
        html[data-pf-customizer-preview] body.has-modal-opening,
        html[data-pf-customizer-preview] body.has-dropdown,
        html[data-pf-customizer-preview] body.with-mega {
          overflow-y: auto !important;
        }
      `;
      document.head.appendChild(style);
    }

    let raf = 0;
    const scheduleReport = () => {
      if (raf !== 0) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        reportCustomizerPreviewFrameHeight(parentOrigin);
      });
    };

    scheduleReport();
    window.addEventListener("load", scheduleReport);
    window.addEventListener("resize", scheduleReport);

    const root = document.querySelector(".shopify-liquid-root");
    let observer: ResizeObserver | undefined;
    let mo: MutationObserver | undefined;
    if (root instanceof HTMLElement) {
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(scheduleReport);
        observer.observe(root);
        observer.observe(document.body);
      }
      mo = new MutationObserver(scheduleReport);
      mo.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
    }

    return () => {
      window.removeEventListener("load", scheduleReport);
      window.removeEventListener("resize", scheduleReport);
      observer?.disconnect();
      mo?.disconnect();
      if (raf !== 0) window.cancelAnimationFrame(raf);
      document.documentElement.removeAttribute("data-pf-customizer-preview");
      document.getElementById(PREVIEW_STYLE_ID)?.remove();
    };
  }, [allowedParentOrigin]);

  return null;
}
