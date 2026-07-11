import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperadminId } from "@/lib/settings-service";

const PUBLIC_KEYS = [
  "loginImage",
  "loginBgColor",
  "loginFormBgColor",
  "titleText",
  "footerText",
  // Maps key for public address autocomplete (browser key, referrer-restricted)
  "googleMapsApiKey",
] as const;

export async function GET() {
  try {
    const superadminId = await getSuperadminId();
    const rows = await prisma.setting.findMany({
      where: { createdBy: superadminId, key: { in: [...PUBLIC_KEYS] } },
      select: { key: true, value: true },
    });
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value ?? "";
    }
    return NextResponse.json({ ok: true, settings: result });
  } catch {
    return NextResponse.json({ ok: true, settings: {} });
  }
}
