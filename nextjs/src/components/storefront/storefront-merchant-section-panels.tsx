"use client";

import { appConfirm } from "@/lib/app-confirm";

import { useCallback, useEffect, useState } from "react";

import { StorefrontAnalyticsAdmin } from "@/components/storefront/storefront-analytics-admin";
import { StorefrontOrdersAdmin } from "@/components/storefront/storefront-orders-admin";
import { StorefrontCustomersAdmin } from "@/components/storefront/storefront-customers-admin";
import { StorefrontTaxesAdmin } from "@/components/storefront/storefront-taxes-admin";
import { StorefrontShippingAdmin } from "@/components/storefront/storefront-shipping-admin";
import { StorefrontDiscountsAdmin } from "@/components/storefront/storefront-discounts-admin";
import { StorefrontCheckoutAdmin } from "@/components/storefront/storefront-checkout-admin";
import { StorefrontCollectionsAdmin } from "@/components/storefront/storefront-collections-admin";
import { StorefrontNavigationAdmin } from "@/components/storefront/storefront-navigation-admin";
import { StorefrontProductsAdmin } from "@/components/storefront/storefront-products-admin";
import { StorefrontThemesSection } from "@/components/storefront/storefront-themes-section";
import { StorefrontBlogAdmin } from "@/components/storefront/storefront-blog-admin";
import { StorefrontEventsAdmin } from "@/components/storefront/storefront-events-admin";
import { StorefrontPagesAdmin } from "@/components/storefront/storefront-pages-admin";
import { StorefrontSettingsAdmin } from "@/components/storefront/storefront-settings-admin";
import { StorefrontWebsitesSettings, type WebsiteRow } from "@/components/storefront/storefront-websites-settings";
import type { StorefrontMerchantSectionId } from "@/components/storefront/storefront-sections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/admin-t";

/**
 * Section IDs that render a dedicated admin panel (not the generic placeholder card).
 * `overview` is rendered by `app/storefront/[section]/page.tsx` instead of this component.
 */
export const STOREFRONT_MERCHANT_EXPLICIT_PANEL_IDS = [
  "websites",
  "analytics",
  "themes",
  "pages",
  "blog",
  "events",
  "navigation",
  "settings",
  "orders",
  "discounts",
  "shipping",
  "taxes",
  "products",
  "collections",
  "checkout",
  "customers",
] as const satisfies readonly StorefrontMerchantSectionId[];

export function StorefrontMerchantSectionPanels({ section }: { section: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [websites, setWebsites] = useState<WebsiteRow[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [domainWebsiteId, setDomainWebsiteId] = useState("");
  const [domains, setDomains] = useState<{ id: string; hostname: string; status: string; isPrimary: boolean }[]>([]);
  const [domainHostname, setDomainHostname] = useState("");

  const loadWebsites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/storefront/websites", { credentials: "same-origin" });
      const data = (await res.json()) as { ok?: boolean; data?: WebsiteRow[]; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      const list = data.data ?? [];
      setWebsites(list);
      if (list.length > 0) {
        setDomainWebsiteId((prev) => {
          if (prev && list.some((w) => w.id === prev)) return prev;
          const active = list.find((w) => w.status.toLowerCase() === "active");
          return active?.id ?? list[0]!.id;
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDomains = useCallback(async () => {
    if (!domainWebsiteId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/storefront/domains?websiteId=${encodeURIComponent(domainWebsiteId.trim())}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        data?: { id: string; hostname: string; status: string; isPrimary: boolean }[];
        message?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setDomains(data.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [domainWebsiteId]);

  useEffect(() => {
    if (section === "websites") void loadWebsites();
  }, [section, loadWebsites]);

  useEffect(() => {
    if (section === "websites" && domainWebsiteId) void loadDomains();
  }, [section, domainWebsiteId, loadDomains]);

  const createWebsite = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/storefront/websites", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setName("");
      setSlug("");
      await loadWebsites();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const addDomain = async () => {
    if (!domainWebsiteId.trim() || !domainHostname.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/storefront/domains", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          websiteId: domainWebsiteId.trim(),
          hostname: domainHostname.trim(),
          isPrimary: true,
          status: "active",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      setDomainHostname("");
      await loadDomains();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const removeDomain = async (domainId: string) => {
    if (!(await appConfirm(t("Remove this domain?")))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/storefront/domains/${encodeURIComponent(domainId)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Failed");
      await loadDomains();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  if (section === "websites") {
    return (
      <StorefrontWebsitesSettings
        loading={loading}
        error={error}
        websites={websites}
        name={name}
        setName={setName}
        slug={slug}
        setSlug={setSlug}
        onCreateWebsite={() => void createWebsite()}
        domainWebsiteId={domainWebsiteId}
        setDomainWebsiteId={setDomainWebsiteId}
        domains={domains}
        domainHostname={domainHostname}
        setDomainHostname={setDomainHostname}
        onAddDomain={() => void addDomain()}
        onReloadDomains={() => void loadDomains()}
        onRemoveDomain={(id) => void removeDomain(id)}
      />
    );
  }

  if (section === "analytics") {
    return <StorefrontAnalyticsAdmin />;
  }

  if (section === "themes") {
    return <StorefrontThemesSection />;
  }

  if (section === "pages") {
    return <StorefrontPagesAdmin />;
  }

  if (section === "blog") {
    return <StorefrontBlogAdmin />;
  }

  if (section === "events") {
    return <StorefrontEventsAdmin />;
  }

  if (section === "navigation") {
    return <StorefrontNavigationAdmin />;
  }

  if (section === "settings") {
    return <StorefrontSettingsAdmin />;
  }

  if (section === "orders") {
    return <StorefrontOrdersAdmin />;
  }

  if (section === "discounts") {
    return <StorefrontDiscountsAdmin />;
  }
  if (section === "shipping") {
    return <StorefrontShippingAdmin />;
  }
  if (section === "taxes") {
    return <StorefrontTaxesAdmin />;
  }

  if (section === "products") {
    return <StorefrontProductsAdmin />;
  }

  if (section === "collections") {
    return <StorefrontCollectionsAdmin />;
  }

  if (section === "checkout") {
    return <StorefrontCheckoutAdmin />;
  }

  if (section === "customers") {
    return <StorefrontCustomersAdmin />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(section.replace(/-/g, " "))}</CardTitle>
        <CardDescription>{t("Connected to Storefront APIs — use Websites, Pages, Themes, and Analytics for live data.")}</CardDescription>
      </CardHeader>
    </Card>
  );
}
