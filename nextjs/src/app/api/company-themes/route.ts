import { NextResponse } from "next/server";

import { listCompanyNextjsThemeOptions } from "@/lib/company-themes/registry";

export async function GET() {
  return NextResponse.json({ ok: true, themes: listCompanyNextjsThemeOptions() });
}
