import { NextResponse, type NextRequest } from "next/server";

import {
  ACCOUNT_PAYMENT_TERMS_OPTIONS_KEY,
  parseAccountPaymentTermsOptions,
} from "@/lib/account-payment-terms";
import { hasAccountPermission } from "@/lib/authz";
import { getMergedSettingsForUserEmail } from "@/lib/settings-service";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function appUrlFromReq(req: NextRequest): string {
  const env = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (env) return env.replace(/\/+$/, "");
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const perms = await getPermissionsFromRequest(req);
  const canUse =
    perms.includes("*") ||
    hasAccountPermission(perms, "manage-customers") ||
    hasAccountPermission(perms, "create-customers");
  if (!canUse) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const actorEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!actorEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getMergedSettingsForUserEmail(actorEmail, appUrlFromReq(req));
  const payment_terms_options = parseAccountPaymentTermsOptions(
    settings[ACCOUNT_PAYMENT_TERMS_OPTIONS_KEY],
  );

  return NextResponse.json({ payment_terms_options });
}
