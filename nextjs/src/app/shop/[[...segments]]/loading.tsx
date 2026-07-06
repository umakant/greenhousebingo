export default function ShopRouteLoading() {
  return (
    <div className="min-h-[60vh] space-y-6 p-6">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-12 w-full max-w-xl animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mx-auto max-w-6xl">
        <div className="aspect-[21/9] w-full animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-52 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
