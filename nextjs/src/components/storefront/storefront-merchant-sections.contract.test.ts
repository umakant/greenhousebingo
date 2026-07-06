import { describe, expect, it } from "vitest";

import { STOREFRONT_MERCHANT_EXPLICIT_PANEL_IDS } from "@/components/storefront/storefront-merchant-section-panels";
import { STOREFRONT_MERCHANT_SECTIONS } from "@/components/storefront/storefront-sections";

describe("Storefront merchant sections", () => {
  it("lists unique section ids and stable hrefs", () => {
    const ids = STOREFRONT_MERCHANT_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of STOREFRONT_MERCHANT_SECTIONS) {
      expect(s.href).toBe(`/storefront/${s.id}`);
      expect(s.permission.length).toBeGreaterThan(0);
    }
  });

  it("gives every non-overview section an explicit panel (no silent fallback)", () => {
    const explicit = new Set(STOREFRONT_MERCHANT_EXPLICIT_PANEL_IDS);
    const configured = new Set(STOREFRONT_MERCHANT_SECTIONS.map((s) => s.id));

    for (const s of STOREFRONT_MERCHANT_SECTIONS) {
      // overview/onboarding are rendered by app/storefront/[section]/page.tsx directly.
      // events-schedule has its own dedicated route at app/storefront/events-schedule/page.tsx
      // (calendar dashboard) so it never falls through to the panel switch.
      if (s.id === "overview" || s.id === "onboarding" || s.id === "events-schedule") continue;
      expect(explicit.has(s.id), `Missing panel for /storefront/${s.id}`).toBe(true);
    }

    for (const id of STOREFRONT_MERCHANT_EXPLICIT_PANEL_IDS) {
      expect(configured.has(id), `Panel id "${id}" is not in STOREFRONT_MERCHANT_SECTIONS`).toBe(true);
    }

    const panelIdList = STOREFRONT_MERCHANT_EXPLICIT_PANEL_IDS as readonly string[];
    expect(panelIdList.includes("overview")).toBe(false);
  });
});
