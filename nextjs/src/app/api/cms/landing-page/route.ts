import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

async function nextSettingId(): Promise<bigint> {
  const agg = await prisma.setting.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0n) + 1n;
}

async function upsertAdminSetting(superadminId: bigint, key: string, value: string) {
  const existing = await prisma.setting.findFirst({
    where: { key, createdBy: superadminId },
    select: { id: true },
  });
  if (existing?.id) {
    await prisma.setting.update({ where: { id: existing.id }, data: { value, updatedAt: new Date() } });
    return;
  }
  await prisma.setting.create({
    data: {
      id: await nextSettingId(),
      key,
      value,
      isPublic: true,
      createdBy: superadminId,
      createdAt: new Date(),
    },
  });
}

export async function GET(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-landing-page") && !perms.includes("*")) {
    // Some installs may not have this permission seeded yet; superadmin `*` will pass above.
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const superadmin = await prisma.user.findFirst({ where: { type: "superadmin" }, select: { id: true } });
  const superadminId = superadmin?.id ?? 1n;

  const lps = await prisma.landingPageSetting.findFirst({
    orderBy: { id: "asc" },
    select: { id: true, companyName: true, contactEmail: true, contactPhone: true, contactAddress: true, configSections: true },
  });

  const settingsRows = await prisma.setting.findMany({
    where: { createdBy: superadminId, key: { in: ["landingPageEnabled", "enableRegistration", "logoDark", "logoLight"] } },
    select: { key: true, value: true },
  });
  const adminSettings: Record<string, string> = {};
  for (const r of settingsRows) adminSettings[r.key] = r.value ?? "";

  return NextResponse.json({
    ok: true,
    landingPageSetting: lps
      ? {
          id: lps.id.toString(),
          companyName: lps.companyName ?? "",
          contactEmail: lps.contactEmail ?? "",
          contactPhone: lps.contactPhone ?? "",
          contactAddress: lps.contactAddress ?? "",
          configSections: lps.configSections ?? null,
        }
      : null,
    adminSettings,
  });
}

export async function PATCH(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-landing-page") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const contactEmail = typeof body?.contactEmail === "string" ? body.contactEmail.trim() : "";
  const contactPhone = typeof body?.contactPhone === "string" ? body.contactPhone.trim() : "";
  const contactAddress = typeof body?.contactAddress === "string" ? body.contactAddress.trim() : "";
  const configSections = body?.configSections ?? null;

  const superadmin = await prisma.user.findFirst({ where: { type: "superadmin" }, select: { id: true } });
  const superadminId = superadmin?.id ?? 1n;

  const existing = await prisma.landingPageSetting.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
  if (existing?.id) {
    await prisma.landingPageSetting.update({
      where: { id: existing.id },
      data: {
        companyName: companyName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        contactAddress: contactAddress || null,
        configSections,
        updatedAt: new Date(),
      },
    });
  } else {
    const agg = await prisma.landingPageSetting.aggregate({ _max: { id: true } });
    const nextId = (agg._max.id ?? 0n) + 1n;
    await prisma.landingPageSetting.create({
      data: {
        id: nextId,
        companyName: companyName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        contactAddress: contactAddress || null,
        configSections,
        createdAt: new Date(),
      },
    });
  }

  if (body?.adminSettings && typeof body.adminSettings === "object") {
    const landingPageEnabled = body.adminSettings.landingPageEnabled;
    const enableRegistration = body.adminSettings.enableRegistration;
    const logoDark = body.adminSettings.logoDark;
    const logoLight = body.adminSettings.logoLight;
    if (landingPageEnabled != null) {
      await upsertAdminSetting(superadminId, "landingPageEnabled", String(landingPageEnabled));
    }
    if (enableRegistration != null) {
      await upsertAdminSetting(superadminId, "enableRegistration", String(enableRegistration));
    }
    if (logoDark != null) {
      await upsertAdminSetting(superadminId, "logoDark", String(logoDark));
    }
    if (logoLight != null) {
      await upsertAdminSetting(superadminId, "logoLight", String(logoLight));
    }
  }

  return NextResponse.json({ ok: true });
}

