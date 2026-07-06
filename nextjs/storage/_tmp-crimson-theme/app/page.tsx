/** Fallback — marketing pages are served via middleware → /api/html */
export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <p>Loading Crimson Consulting theme…</p>
      <p>
        If this message persists, ensure <code>middleware.ts</code> is active and
        run <code>npm run dev</code> from the project root.
      </p>
    </main>
  );
}
