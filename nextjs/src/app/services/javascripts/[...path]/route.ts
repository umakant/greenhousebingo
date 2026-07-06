import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Shopify-hosted scripts referenced as absolute paths (e.g. `| script_tag` on
 * `"/services/javascripts/currencies.js"`). Next.js otherwise returns HTML 404 →
 * `Uncaught SyntaxError: Unexpected token '<'` in the browser.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  const joined = ((await ctx.params).path ?? []).join("/");
  if (joined === "currencies.js") {
    const body =
      "/* Shopify currencies.js — off-platform no-op; theme `jquery.currencies*.js` supplies Currency. */\n";
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
  return new NextResponse("Not found.", { status: 404 });
}
