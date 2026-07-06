export default function StorefrontAccountIndexPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">Storefront customer account</h1>
        <p className="mt-3 text-sm text-slate-400">
          Customer sign-in uses a per-website URL (separate from staff <code className="rounded bg-slate-800 px-1">/storefront/…</code> admin).
        </p>
        <p className="mt-4 text-sm text-slate-300">
          Example:{" "}
          <code className="break-all rounded bg-slate-900 px-2 py-1 text-slate-200">
            /storefront/account/w/&lt;websiteId&gt;/login
          </code>
        </p>
      </div>
    </div>
  );
}
