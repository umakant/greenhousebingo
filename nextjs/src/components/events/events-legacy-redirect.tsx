"use client";

import { useEffect } from "react";

/** Redirects legacy `/shop/pages/events#event-{id}` links to `/events`. */
export function EventsLegacyRedirect() {
  useEffect(() => {
    window.location.replace(`/events${window.location.hash}`);
  }, []);
  return null;
}
