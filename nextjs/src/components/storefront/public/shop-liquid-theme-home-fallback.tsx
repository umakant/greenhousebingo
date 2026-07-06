/**
 * Shown when a Shopify ZIP theme is active for this website but Liquid rendering
 * returned nothing for the storefront homepage (so shoppers would otherwise see the generic /shop not-found).
 */
export function ShopLiquidThemeHomeFallback({
  host,
  packageFile,
}: {
  host: string;
  packageFile: string;
}) {
  const pkg = packageFile.startsWith("/") ? packageFile : `/${packageFile}`;
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold text-foreground">Shopify theme homepage did not render</h1>
      <p className="max-w-lg text-sm text-muted-foreground">
        A published Shopify ZIP theme is configured for this website, but Paper Flight could not produce HTML for the
        homepage. That usually means the theme archive could not be read, extraction failed, or Liquid hit an unsupported
        tag in this theme.
      </p>
      <ul className="max-w-lg list-disc space-y-2 pl-5 text-left text-sm text-muted-foreground">
        <li>
          In <strong>Storefronts → Themes</strong>, click <strong>Republish</strong> on your live theme so the ZIP is
          extracted again into server storage.
        </li>
        <li>
          Confirm the file exists on the app server at{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">public{pkg}</code> (paths are relative to the Next.js app
          root).
        </li>
        <li>
          Under <strong>Storefronts → Websites</strong>, the domain for{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{host || "this host"}</code> must belong to the{" "}
          <strong>same website</strong> that shows the Live theme badge (not another site in the same company).
        </li>
        <li>
          Check server logs for <code className="rounded bg-muted px-1 text-[11px]">tryRenderShopifyLiquidStorefront</code>{" "}
          or <code className="rounded bg-muted px-1 text-[11px]">re-extract failed</code>.
        </li>
      </ul>
    </div>
  );
}
