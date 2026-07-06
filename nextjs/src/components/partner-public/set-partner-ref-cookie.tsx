"use client";

import { useEffect } from "react";

/** Persists the partner referral slug in a 30-day cookie so signup can attribute it later. */
export default function SetPartnerRefCookie({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const maxAge = 60 * 60 * 24 * 30;
      document.cookie = `pf_partner_ref=${encodeURIComponent(slug)}; path=/; max-age=${maxAge}; samesite=lax`;
    } catch {
      /* no-op */
    }
  }, [slug]);

  return null;
}
