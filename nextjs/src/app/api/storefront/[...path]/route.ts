import { NextRequest, NextResponse } from "next/server";

import { assertStorefrontApiAccess } from "@/lib/storefront-access";

async function handle(req: NextRequest) {
  const write = req.method !== "GET" && req.method !== "HEAD";
  const denied = await assertStorefrontApiAccess(req, write ? { requireMutation: true } : {});
  if (denied) return denied;

  const segments = req.nextUrl.pathname.replace(/^\/api\/storefront\/?/, "").split("/").filter(Boolean);
  return NextResponse.json({
    ok: true,
    method: req.method,
    path: segments.join("/"),
    message: "Storefront API stub — attach domain logic here.",
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
