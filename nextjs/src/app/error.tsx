"use client";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV === "development";
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">Please try again in a moment.</p>
        {isDev && error?.message ? (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md border bg-muted/50 p-3 text-left text-xs text-foreground">{error.message}</pre>
        ) : null}
        {error?.digest ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Reference: <code className="rounded bg-muted px-1">{error.digest}</code> (search server logs for this digest)
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
