"use client";

import * as React from "react";

/**
 * Tracks whether `<html>` has the `dark` class (same as `pf_theme` / Appearance menu).
 * Uses `useLayoutEffect` so the first paint after hydration matches the theme script.
 * Initial state is `false` on both server and client to avoid SSR hydration mismatches; the
 * layout effect syncs from the DOM immediately on the client.
 */
export function useIsDark() {
  const [isDark, setIsDark] = React.useState(false);

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    const read = () => setIsDark(root.classList.contains("dark"));
    read();

    const obs = new MutationObserver(() => read());
    obs.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => obs.disconnect();
  }, []);

  return isDark;
}
