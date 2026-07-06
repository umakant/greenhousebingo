import { NextRequest, NextResponse } from "next/server";

import { hasPermission } from "@/lib/authz";
import {
  getCompanyThemeCustomizerForUserId,
  saveCompanyThemeCustomizerForUserId,
} from "@/lib/company-themes/customizer-service";
import { canUseCompanyWebsite } from "@/lib/company-themes/company-website-access";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { prisma } from "@/lib/prisma";

async function currentUserId(req: NextRequest): Promise<bigint | null> {
  const raw = req.cookies.get("pf_user_id")?.value;
  if (!raw) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

async function requireBrandSettingsWrite(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) {
    return { ok: false as const, res: NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 }) };
  }
  const perms = await getPermissionsFromRequest(req);
  if (!hasPermission(perms, "edit-brand-settings") && !perms.includes("*")) {
    return { ok: false as const, res: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const };
}

export async function GET(req: NextRequest) {
  const auth = await requireBrandSettingsWrite(req);
  if (!auth.ok) return auth.res;

  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, type: true, createdBy: true },
  });
  if (!user || !canUseCompanyWebsite(user)) {
    return NextResponse.json(
      { ok: false, message: "Company website theme is only available for individual company accounts." },
      { status: 403 },
    );
  }

  const data = await getCompanyThemeCustomizerForUserId(userId);
  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Select and save a company website theme before customizing." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, ...data });
}

export async function POST(req: NextRequest) {
  const auth = await requireBrandSettingsWrite(req);
  if (!auth.ok) return auth.res;

  const userId = await currentUserId(req);
  if (!userId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, type: true, createdBy: true },
  });
  if (!user || !canUseCompanyWebsite(user)) {
    return NextResponse.json(
      { ok: false, message: "Company website theme is only available for individual company accounts." },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const slug = String(body.slug ?? "").trim();
  const values = (body.values ?? {}) as Record<string, string>;
  if (!slug) {
    return NextResponse.json({ ok: false, message: "slug is required." }, { status: 400 });
  }

  try {
    await saveCompanyThemeCustomizerForUserId(userId, slug, values);
    return NextResponse.json({ ok: true, message: "Theme customizations saved." });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save customizations.";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
