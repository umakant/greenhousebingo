export default function ShopNotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This storefront URL does not have a published page yet. Publish a page from Storefronts → Pages, or check the path.
      </p>
    </div>
  );
}
