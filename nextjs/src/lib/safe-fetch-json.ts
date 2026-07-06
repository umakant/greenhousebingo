/**
 * When nginx (or another proxy) rejects the body before Node runs, the client often receives HTML (413 page)
 * instead of JSON — especially for multipart uploads.
 */
export const REVERSE_PROXY_413_UPLOAD_MESSAGE =
  "This upload was blocked by the reverse proxy (HTTP 413 — request body too large). " +
  "The app allows up to 4 MB per image; nginx’s default limit is often 1 MB, so small images can still fail until you raise it. " +
  "Add client_max_body_size 5m; to the http or server block, then sudo nginx -t && sudo systemctl reload nginx. " +
  "Use a smaller or more compressed file. See deploy/nextjs.nginx.example in the repository.";

function isReverseProxy413HtmlBody(status: number, text: string): boolean {
  if (status === 413) return true;
  if (/413\s+Request Entity Too Large/i.test(text)) return true;
  if (/request entity too large/i.test(text)) return true;
  const t = text.trimStart();
  return t.startsWith("<") && /413|entity too large/i.test(text);
}

/**
 * Prefer over `Response.json()` when a reverse proxy or error handler may return an **empty body**
 * (which makes `res.json()` throw `SyntaxError: Unexpected end of JSON input`).
 */
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      `Empty response from API (HTTP ${res.status}). The server may have timed out, crashed, or a proxy stripped the body.`,
    );
  }
  if (isReverseProxy413HtmlBody(res.status, text)) {
    throw new Error(REVERSE_PROXY_413_UPLOAD_MESSAGE);
  }
  const looksLikeHtmlError =
    trimmed.startsWith("<") || trimmed.startsWith("<!") || /^<\s*html/i.test(trimmed);
  if (looksLikeHtmlError) {
    throw new Error(
      `Server returned HTML instead of JSON (HTTP ${res.status}). Often a reverse-proxy limit, 404/502, or auth redirect — check API routes, nginx logs, and deploy logs.`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid JSON";
    const preview = text.length > 280 ? `${text.slice(0, 280)}…` : text;
    throw new Error(`${msg} (HTTP ${res.status}). Body starts with: ${preview.replace(/\s+/g, " ").trim()}`);
  }
}
