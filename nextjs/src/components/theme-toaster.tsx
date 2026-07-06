"use client";

import * as React from "react";
import { Toaster } from "sonner";

/**
 * Toasts must follow the same `html.dark` state as the rest of the shell (not OS `prefers-color-scheme` alone).
 * The inner toaster uses `useSyncExternalStore` so it tracks `html.dark` immediately (no one-frame lag).
 * It only mounts on the client so it never SSRs against an unknown `pf_theme`.
 */
function subscribe(onStoreChange: () => void) {
  const root = document.documentElement;
  const obs = new MutationObserver(onStoreChange);
  obs.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });
  return () => obs.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  return false;
}

function ToasterThemed() {
  const isDark = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <Toaster richColors closeButton theme={isDark ? "dark" : "light"} />;
}

export function ThemeToaster() {
  const [mounted, setMounted] = React.useState(false);

  React.useLayoutEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <ToasterThemed />;
}
