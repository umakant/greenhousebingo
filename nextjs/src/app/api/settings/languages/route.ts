import { NextResponse, type NextRequest } from "next/server";

import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { LANGUAGE_CATALOG_SETTING_KEY, normalizeLanguageCatalogInput } from "@/lib/settings-page-data";
import {
  getSettingsForOwner,
  getUserByEmail,
  settingsOwnerIdForUser,
  upsertOwnerSettings,
} from "@/lib/settings-service";

async function requirePermission(
  req: NextRequest,
  required: string,
): Promise<{ ok: true; perms: string[] } | { ok: false; res: NextResponse }> {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return { ok: false, res: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }) };

  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, required) && !perms.includes("*")) {
    return { ok: false, res: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, perms };
}

export async function POST(req: NextRequest) {
  const baseAuthz = await requirePermission(req, "manage-settings");
  if (!baseAuthz.ok) return baseAuthz.res;

  const authz = await requirePermission(req, "edit-system-settings");
  if (!authz.ok) return authz.res;

  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  const user = await getUserByEmail(email);
  if (!user) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { languages?: unknown };
  const norm = normalizeLanguageCatalogInput(body.languages);
  if (!norm.ok) {
    return NextResponse.json({ ok: false, message: norm.message }, { status: 400 });
  }

  const enabledRows = norm.rows.filter((r) => r.enabled !== false);
  if (enabledRows.length === 0) {
    return NextResponse.json({ ok: false, message: "At least one enabled language is required." }, { status: 400 });
  }

  const ownerId = settingsOwnerIdForUser(user);
  const ownerSettings = await getSettingsForOwner(ownerId);
  const codes = new Set(norm.rows.map((r) => r.code));
  let defaultLanguage = (ownerSettings.defaultLanguage ?? "").trim().toLowerCase() || "en";
  let adjustedDefault: string | undefined;
  if (!codes.has(defaultLanguage)) {
    defaultLanguage = enabledRows[0]!.code;
    adjustedDefault = defaultLanguage;
  }

  const items: Array<{ key: string; value: string; isPublic?: boolean }> = [
    { key: LANGUAGE_CATALOG_SETTING_KEY, value: JSON.stringify(norm.rows), isPublic: true },
  ];
  if (adjustedDefault) {
    items.push({ key: "defaultLanguage", value: defaultLanguage, isPublic: true });
  }

  await upsertOwnerSettings(ownerId, items);
  return NextResponse.json({ ok: true, defaultLanguage: adjustedDefault });
}
