/**
 * Hybrid Pages route: ensures `next build` emits server artifacts for /500 so
 * the runtime does not ENOENT on `.next/server/pages/500.html` when serving
 * fatal errors (alongside the App Router).
 */
export default function Custom500() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        background: "#f8fafc",
        color: "#0f172a",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Server error</h1>
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
          Something went wrong. Please refresh the page or try again later.
        </p>
      </div>
    </div>
  );
}
