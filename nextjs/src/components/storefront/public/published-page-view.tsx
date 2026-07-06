import type { CSSProperties, ReactNode } from "react";

import type { PublicShopPagePayload, PublicShopSection } from "@/lib/storefront/public-shop-page";
import type { PublicStorefrontBrandSettings } from "@/lib/storefront/public-storefront-settings";
import { rewritePoweredByShopifyAttribution } from "@/lib/storefront/liquid/rewrite-storefront-powered-by";
import { stripShopifyHostedRuntimeAssetRefs } from "@/lib/storefront/liquid/strip-shopify-hosted-runtime-scripts";

import { ConceptStorefrontChrome } from "@/components/storefront/public/concept-storefront-chrome";

type Props = {
  data: PublicShopPagePayload;
};

function settingsObject(s: unknown): Record<string, unknown> {
  if (s && typeof s === "object" && !Array.isArray(s)) return s as Record<string, unknown>;
  return {};
}

function blockDataObject(d: unknown): Record<string, unknown> {
  if (d && typeof d === "object" && !Array.isArray(d)) return d as Record<string, unknown>;
  return {};
}

/** Minimal component registry for published sections. */
function SectionView({ section }: { section: PublicShopSection }) {
  const key = (section.instanceKey ?? "section").toLowerCase();
  const st = settingsObject(section.settings);

  if (key.includes("header")) {
    return (
      <header className="border-b bg-background/80 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4">
          <span className="text-lg font-semibold">{String(st.title ?? st.heading ?? "Store")}</span>
        </div>
      </header>
    );
  }

  if (key.includes("announcement")) {
    return (
      <div className="bg-primary py-2 text-center text-sm text-primary-foreground">
        {String(st.message ?? st.text ?? "")}
      </div>
    );
  }

  if (key.includes("hero") || key === "herobanner") {
    return (
      <section className="bg-muted/40 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight">{String(st.heading ?? st.title ?? "Welcome")}</h1>
          {st.subheading ? <p className="mt-2 text-muted-foreground">{String(st.subheading)}</p> : null}
        </div>
      </section>
    );
  }

  if (key.includes("richtext") || key.includes("rich_text")) {
    const raw = section.blocks.map((b) => String(blockDataObject(b.data).html ?? blockDataObject(b.data).body ?? "")).join("\n");
    const body = rewritePoweredByShopifyAttribution(
      stripShopifyHostedRuntimeAssetRefs(raw || String(st.html ?? "")),
    );
    return (
      <section className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl px-4 py-8">
        <div dangerouslySetInnerHTML={{ __html: body }} />
      </section>
    );
  }

  if (key.includes("footer")) {
    return (
      <footer className="mt-auto border-t py-8 text-center text-sm text-muted-foreground">
        {String(st.note ?? st.copyright ?? "© Store")}
      </footer>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-3 px-4 py-6">
      <p className="text-xs uppercase text-muted-foreground">{section.instanceKey ?? "section"}</p>
      {section.blocks.length === 0 ? (
        <pre className="overflow-auto rounded-md bg-muted/50 p-3 text-xs">{JSON.stringify(st, null, 2)}</pre>
      ) : (
        <ul className="space-y-2">
          {section.blocks.map((b) => (
            <li key={b.id} className="rounded-md border p-3 text-sm">
              <pre className="whitespace-pre-wrap font-mono text-xs">{JSON.stringify(b.data, null, 2)}</pre>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PublishedPageView({ data }: Props) {
  const cssVars = Object.entries(data.styleVars).reduce<Record<string, string>>((acc, [k, v]) => {
    acc[`--${k.replace(/[^a-zA-Z0-9-_]/g, "-")}`] = v;
    return acc;
  }, {});

  return (
    <PublishedPageChrome
      style={cssVars as CSSProperties}
      publicSettings={data.publicSettings}
      title={data.pageTitle}
      websiteId={data.websiteId}
    >
      <main className="flex-1">
        {data.sections.length === 0 ? (
          <p className="p-8 text-center text-muted-foreground">This page has no sections yet.</p>
        ) : (
          data.sections.map((s) => <SectionView key={s.id} section={s} />)
        )}
      </main>
    </PublishedPageChrome>
  );
}

export function PublishedPageChrome({
  children,
  publicSettings,
  title,
  websiteId,
  showStoreNav = true,
  style,
  className,
}: {
  children: ReactNode;
  publicSettings: PublicStorefrontBrandSettings;
  title: string;
  /** Public website id — enables account link when customer accounts are enabled. */
  websiteId?: string;
  showStoreNav?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  if (!showStoreNav) {
    return <>{children}</>;
  }
  return (
    <ConceptStorefrontChrome
      publicSettings={publicSettings}
      websiteId={websiteId}
      title={title}
      style={style}
      className={className}
    >
      {children}
    </ConceptStorefrontChrome>
  );
}
