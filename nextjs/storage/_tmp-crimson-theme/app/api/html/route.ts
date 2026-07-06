import { NextRequest } from "next/server";
import { loadStaticHtml } from "@/lib/static-html";

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("path") || "/";
  const html = loadStaticHtml(pathname);

  if (!html) {
    return new Response("Page not found", { status: 404 });
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
