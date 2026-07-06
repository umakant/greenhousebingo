import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  clearNextFilesystemCache,
  getNextCacheSizeMbString,
  revalidateNextDataCache,
} from "@/lib/next-cache-admin";

export const runtime = "nodejs";

/**
 * Mirrors Laravel `php artisan optimize` in spirit: clear runtime caches and
 * refresh derived data. Next.js has no single "optimize" CLI in production;
 * we combine filesystem cache wipe (where allowed) with layout/tag revalidation.
 */
export async function POST(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "clear-cache")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  await clearNextFilesystemCache();
  revalidateNextDataCache();

  const cacheSize = await getNextCacheSizeMbString();
  return NextResponse.json({
    ok: true,
    message: "Site optimized successfully.",
    cacheSize,
  });
}
