import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { pgTableExists } from "@/lib/db/pg-table-exists";

/** Maps DB module name -> activated-package key (lowercase). General = always visible. */
const MODULE_TO_PACKAGE: Record<string, string | null> = {
  general:     null,
  Lead:        "lead",
  Appointment: "appointment",
  HRM:         "hrm",
  Recruitment: "recruitment",
};

function checkAuth(req: NextRequest, perm: string): { denied: NextResponse } | { role: string; activatedPackages: string[] } {
  const role = req.cookies.get("pf_role")?.value ?? "";
  if (role !== "superadmin" && role !== "company") {
    return { denied: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, perm) && !perms.includes("*")) {
    return { denied: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  const activatedPackages = JSON.parse(req.cookies.get("pf_activated_packages")?.value ?? "[]") as string[];
  return { role, activatedPackages };
}

function canAccessModule(role: string, activatedPackages: string[], module: string): boolean {
  if (role === "superadmin") return true;
  const pkg = MODULE_TO_PACKAGE[module];
  if (pkg === null) return true; // general
  if (pkg === undefined) return true; // unknown modules — allow by default
  return activatedPackages.map((p) => p.toLowerCase()).includes(pkg);
}

async function findLang(parentId: bigint, lang: string) {
  const row = await prisma.notificationTemplateLang.findFirst({
    where: { parentId, lang },
    select: { id: true, lang: true, content: true, variables: true },
  });
  if (row) return row;
  const fallback = await prisma.notificationTemplateLang.findFirst({
    where: { parentId, lang: "en" },
    select: { id: true, lang: true, content: true, variables: true },
  });
  return fallback ?? null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = checkAuth(req, "edit-notification-templates");
  if ("denied" in auth) return auth.denied;
  const { role, activatedPackages } = auth;

  const hasNotifications = await pgTableExists("notifications");
  const hasLangs = await pgTableExists("notification_template_langs");
  if (!hasNotifications || !hasLangs) {
    return NextResponse.json({ ok: false, message: "Notification templates tables are not initialized." }, { status: 400 });
  }

  const { id } = await ctx.params;
  const templateId = BigInt(id);
  const lang = req.nextUrl.searchParams.get("lang") || "en";

  const notificationTemplate = await prisma.notification.findUnique({
    where: { id: templateId },
    select: { id: true, type: true, action: true, module: true },
  });
  if (!notificationTemplate) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  if (!canAccessModule(role, activatedPackages, notificationTemplate.module ?? "general")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const templateLangsRaw = await prisma.notificationTemplateLang.findMany({
    where: { parentId: templateId },
    distinct: ["lang"],
    select: { lang: true },
  });
  const templateLangs = templateLangsRaw.map((r) => ({ lang: r.lang ?? "en" }));

  const curr = await findLang(templateId, lang);
  const variables = (curr?.variables ?? {}) as any;

  return NextResponse.json({
    ok: true,
    notificationTemplate: {
      id: notificationTemplate.id.toString(),
      type: notificationTemplate.type ?? "",
      action: notificationTemplate.action ?? "",
      module: notificationTemplate.module ?? "",
    },
    templateLangs,
    curr: { lang, content: curr?.content ?? "" },
    variables,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = checkAuth(req, "edit-notification-templates");
  if ("denied" in auth) return auth.denied;
  const { role, activatedPackages } = auth;

  const hasNotifications = await pgTableExists("notifications");
  const hasLangs = await pgTableExists("notification_template_langs");
  if (!hasNotifications || !hasLangs) {
    return NextResponse.json({ ok: false, message: "Notification templates tables are not initialized." }, { status: 400 });
  }

  const { id } = await ctx.params;
  const templateId = BigInt(id);

  const notificationTemplate = await prisma.notification.findUnique({
    where: { id: templateId },
    select: { id: true, module: true },
  });
  if (!notificationTemplate) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  if (!canAccessModule(role, activatedPackages, notificationTemplate.module ?? "general")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as any;
  const lang = typeof body?.lang === "string" ? body.lang.trim() : "en";
  const content = typeof body?.content === "string" ? body.content : "";
  if (!lang) return NextResponse.json({ ok: false, message: "Language is required." }, { status: 400 });
  if (!content) return NextResponse.json({ ok: false, message: "Content is required." }, { status: 400 });

  const existing = await prisma.notificationTemplateLang.findFirst({ where: { parentId: templateId, lang }, select: { id: true } });
  if (existing?.id) {
    await prisma.notificationTemplateLang.update({ where: { id: existing.id }, data: { content, updatedAt: new Date() } });
  } else {
    await prisma.notificationTemplateLang.create({ data: { parentId: templateId, lang, content, createdAt: new Date() } });
  }

  return NextResponse.json({ ok: true });
}
