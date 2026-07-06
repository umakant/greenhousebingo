"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import { PF_REACT_MAIN_SLOT_ID } from "@/lib/storefront/liquid/inject-react-main-slot";

/**
 * Renders React children into `#pf-react-main-slot` inside the Liquid theme document
 * (same header/footer as the storefront landing page).
 */
export function LiquidReactMainPortal({ children }: { children: React.ReactNode }) {
  const [node, setNode] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setNode(document.getElementById(PF_REACT_MAIN_SLOT_ID));
  }, []);

  if (!node) return null;
  return createPortal(children, node);
}
