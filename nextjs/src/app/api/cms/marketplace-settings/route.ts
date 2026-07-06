import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";

function requireMarketplaceSettings(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-marketplace-settings") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = requireMarketplaceSettings(req);
  if (blocked) return blocked;

  const moduleCode = req.nextUrl.searchParams.get("module") || "";

  const activeModules = await prisma.addOn.findMany({
    where: { isEnable: true },
    select: { module: true, name: true, packageName: true },
    orderBy: { name: "asc" },
  });

  const selectedModule = moduleCode || activeModules[0]?.module || "";

  const settings = selectedModule
    ? await prisma.marketplaceSetting.findFirst({
        where: { module: selectedModule },
        orderBy: { id: "asc" },
        select: { id: true, module: true, title: true, subtitle: true, configSections: true },
      })
    : null;

  return NextResponse.json({
    ok: true,
    activeModules,
    selectedModule,
    settings: settings
      ? {
          id: settings.id.toString(),
          module: settings.module ?? "",
          title: settings.title ?? "Marketplace",
          subtitle: settings.subtitle ?? "",
          configSections: settings.configSections ?? {},
        }
      : { module: selectedModule, title: "Marketplace", subtitle: "", configSections: {} },
  });
}

export async function PATCH(req: NextRequest) {
  const blocked = requireMarketplaceSettings(req);
  if (blocked) return blocked;

  const body: unknown = await req.json().catch(() => null);
  const bodyObj = (body && typeof body === "object" ? body : null) as Record<string, unknown> | null;
  const moduleCode = typeof bodyObj?.module === "string" ? bodyObj.module.trim() : "";
  if (!moduleCode) return NextResponse.json({ ok: false, message: "Module is required." }, { status: 400 });

  const title = typeof bodyObj?.title === "string" ? bodyObj.title.trim() : "Marketplace";
  const subtitle = typeof bodyObj?.subtitle === "string" ? bodyObj.subtitle.trim() : "";
  const configSections = bodyObj?.configSections ?? {};

  const existing = await prisma.marketplaceSetting.findFirst({ where: { module: moduleCode }, select: { id: true } });
  if (existing?.id) {
    await prisma.marketplaceSetting.update({
      where: { id: existing.id },
      data: {
        title: title || "Marketplace",
        subtitle: subtitle || null,
        module: moduleCode,
        configSections,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.marketplaceSetting.create({
      data: {
        title: title || "Marketplace",
        subtitle: subtitle || null,
        module: moduleCode,
        configSections,
        createdAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}

