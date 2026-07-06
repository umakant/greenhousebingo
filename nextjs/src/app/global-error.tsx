"use client";

/**
 * Catches errors in the root `app/layout` (App Router). Required to render without
 * relying on missing `.next/server/pages/*` fallbacks when the root layout fails.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans antialiased text-slate-900">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">
            {process.env.NODE_ENV === "development" ? error.message : "Please try again in a moment."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
