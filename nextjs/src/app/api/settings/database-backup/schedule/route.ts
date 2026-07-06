import { NextResponse, type NextRequest } from "next/server";

import { isSuperAdminSession } from "@/lib/authz";
import { getSettingsForOwner, getSuperadminId, upsertOwnerSettings } from "@/lib/settings-service";

const KEYS = {
  enabled: "db_backup_auto_enabled",
  frequency: "db_backup_frequency",
} as const;

const FREQUENCIES = ["daily", "weekly", "monthly"] as const;

function requireSuperAdmin(req: NextRequest): { ok: true } | { ok: false; res: NextResponse } {
  if (!isSuperAdminSession(req)) {
    return { ok: false, res: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const authz = requireSuperAdmin(req);
  if (!authz.ok) return authz.res;

  try {
    const ownerId = await getSuperadminId();
    const settings = await getSettingsForOwner(ownerId);
    const frequency = settings[KEYS.frequency]?.trim() || "daily";
    const enabled = settings[KEYS.enabled] === "true" || settings[KEYS.enabled] === "1";
    return NextResponse.json({
      ok: true,
      enabled,
      frequency: FREQUENCIES.includes(frequency as (typeof FREQUENCIES)[number]) ? frequency : "daily",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load schedule";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authz = requireSuperAdmin(req);
  if (!authz.ok) return authz.res;

  try {
    const body = (await req.json().catch(() => ({}))) as { enabled?: boolean; frequency?: string };
    const enabled = !!body?.enabled;
    let frequency = (body?.frequency ?? "daily").trim().toLowerCase();
    if (!FREQUENCIES.includes(frequency as (typeof FREQUENCIES)[number])) frequency = "daily";

    const ownerId = await getSuperadminId();
    await upsertOwnerSettings(ownerId, [
      { key: KEYS.enabled, value: enabled ? "true" : "false" },
      { key: KEYS.frequency, value: frequency },
    ]);

    return NextResponse.json({ ok: true, enabled, frequency });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to save schedule";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
