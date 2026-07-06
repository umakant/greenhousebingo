import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import {
  WATERICE_LANDING_SETTING_KEY,
  getWaterIceLandingConfig,
  normalizeLandingConfig,
} from "@/lib/waterice/landing-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function guard(req: NextRequest): NextResponse | null {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-landing-page") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

async function nextSettingId(): Promise<bigint> {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

export async function GET(req: NextRequest) {
  const blocked = guard(req);
  if (blocked) return blocked;

  const config = await getWaterIceLandingConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PATCH(req: NextRequest) {
  const blocked = guard(req);
  if (blocked) return blocked;

  const body = (await req.json().catch(() => null)) as { config?: unknown } | null;
  const config = normalizeLandingConfig(body?.config);
  const value = JSON.stringify(config);

  const superadmin = await prisma.user.findFirst({ where: { type: "superadmin" }, select: { id: true } });
  const superadminId = superadmin?.id ?? 1n;

  const existing = await prisma.setting.findFirst({
    where: { key: WATERICE_LANDING_SETTING_KEY },
    select: { id: true },
  });

  if (existing?.id) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value, updatedAt: new Date() },
    });
  } else {
    await prisma.setting.create({
      data: {
        id: await nextSettingId(),
        key: WATERICE_LANDING_SETTING_KEY,
        value,
        isPublic: true,
        createdBy: superadminId,
        createdAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true, config });
}
