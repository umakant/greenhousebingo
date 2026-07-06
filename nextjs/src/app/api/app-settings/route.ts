import { NextResponse, type NextRequest } from "next/server";

import { pgTableExists } from "@/lib/db/pg-table-exists";
import { prisma } from "@/lib/prisma";
import { getMergedSettingsForUserEmail } from "@/lib/settings-service";

const EXPOSED_KEYS = [
  "logo_dark",
  "logo_light",
  "favicon",
  "logo_icon",
  "powered_by_light",
  "powered_by_dark",
  "titleText",
  "footerText",
  "company_name",
  "sidebarVariant",
  "sidebarStyle",
  "layoutDirection",
  "themeMode",
  "themeColor",
  "customColor",
  // Date/Time (Settings > System)
  "dateFormat",
  "timeFormat",
  // Currency (Settings > Currency)
  "defaultCurrency",
  "decimalFormat",
  "decimalSeparator",
  "thousandsSeparator",
  "floatNumber",
  "currencySymbolSpace",
  "currencySymbolPosition",
  "currencySymbol",
  // Cookie (Settings > Cookie)
  "enableCookiePopup",
  "enableLogging",
  "strictlyNecessaryCookies",
  "cookieTitle",
  "strictlyCookieTitle",
  "cookieDescription",
  "strictlyCookieDescription",
  "contactUsDescription",
  "contactUsUrl",
  // Maps (Settings > System – used for address autocomplete)
  "googleMapsApiKey",
  // Locale catalog (System Settings > Manage languages)
  "language_catalog",
  "defaultLanguage",
] as const;

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const settings = await getMergedSettingsForUserEmail(email, req.nextUrl.origin);

  const out: Record<string, string> = {};
  for (const k of EXPOSED_KEYS) out[k] = settings[k] ?? "";

  if (!out.currencySymbol && out.defaultCurrency) {
    try {
      const hasCurrencies = await pgTableExists("currencies");
      if (hasCurrencies) {
        const row = await prisma.currency.findFirst({
          where: { code: out.defaultCurrency },
          select: { symbol: true },
        });
        if (row?.symbol) out.currencySymbol = row.symbol;
      }
    } catch {
      // ignore — table may not exist or query may fail
    }
  }
  if (!out.currencySymbol) out.currencySymbol = "$";

  return NextResponse.json({ ok: true, settings: out });
}

