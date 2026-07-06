import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-cookie-settings") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  // MVP: Next.js version doesn't log cookie consent yet (Laravel wrote storage/app/cookie_data.csv).
  const csv = ["IP Address,User Agent,Accepted At,Necessary,Analytics,Marketing"].join("\n") + "\n";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=\"cookie_data.csv\"",
      "cache-control": "no-store",
    },
  });
}

