import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { pgTableExists } from "@/lib/db/pg-table-exists";

function requirePerm(req: NextRequest, perm: string) {
  const role = req.cookies.get("pf_role")?.value;
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, perm) && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }
  return null;
}

async function findLang(parentId: bigint, lang: string) {
  const row = await prisma.emailTemplateLang.findFirst({
    where: { parentId, lang },
    select: { id: true, lang: true, subject: true, content: true, variables: true },
  });
  if (row) return row;
  const fallback = await prisma.emailTemplateLang.findFirst({
    where: { parentId, lang: "en" },
    select: { id: true, lang: true, subject: true, content: true, variables: true },
  });
  return fallback ?? null;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = requirePerm(req, "edit-email-templates");
  if (blocked) return blocked;

  const hasEmailTemplates = await pgTableExists("email_templates");
  const hasEmailLangs = await pgTableExists("email_template_langs");
  if (!hasEmailTemplates || !hasEmailLangs) {
    return NextResponse.json({ ok: false, message: "Email templates tables are not initialized." }, { status: 400 });
  }

  const { id } = await ctx.params;
  const templateId = BigInt(id);
  const lang = req.nextUrl.searchParams.get("lang") || "en";

  const emailTemplate = await prisma.emailTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, name: true, from: true, moduleName: true },
  });
  if (!emailTemplate) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  const templateLangsRaw = await prisma.emailTemplateLang.findMany({
    where: { parentId: templateId },
    distinct: ["lang"],
    select: { lang: true },
  });
  const templateLangs = templateLangsRaw.map((r) => ({ lang: r.lang ?? "en" }));

  const curr = await findLang(templateId, lang);
  const variables = (curr?.variables ?? {}) as any;

  return NextResponse.json({
    ok: true,
    emailTemplate: {
      id: emailTemplate.id.toString(),
      name: emailTemplate.name ?? "",
      from: emailTemplate.from ?? "",
      moduleName: emailTemplate.moduleName ?? "",
    },
    templateLangs,
    curr: {
      lang,
      subject: curr?.subject ?? "",
      content: curr?.content ?? "",
    },
    variables,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const blocked = requirePerm(req, "edit-email-templates");
  if (blocked) return blocked;

  const hasEmailTemplates = await pgTableExists("email_templates");
  const hasEmailLangs = await pgTableExists("email_template_langs");
  if (!hasEmailTemplates || !hasEmailLangs) {
    return NextResponse.json({ ok: false, message: "Email templates tables are not initialized." }, { status: 400 });
  }

  const { id } = await ctx.params;
  const templateId = BigInt(id);

  const emailTemplate = await prisma.emailTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
  if (!emailTemplate) return NextResponse.json({ ok: false, message: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as any;
  const lang = typeof body?.lang === "string" ? body.lang.trim() : "en";
  const subject = typeof body?.subject === "string" ? body.subject : "";
  const content = typeof body?.content === "string" ? body.content : "";
  if (!lang) return NextResponse.json({ ok: false, message: "Language is required." }, { status: 400 });
  if (!subject) return NextResponse.json({ ok: false, message: "Subject is required." }, { status: 400 });
  if (!content) return NextResponse.json({ ok: false, message: "Content is required." }, { status: 400 });

  const existing = await prisma.emailTemplateLang.findFirst({ where: { parentId: templateId, lang }, select: { id: true } });
  if (existing?.id) {
    await prisma.emailTemplateLang.update({
      where: { id: existing.id },
      data: { subject, content, updatedAt: new Date() },
    });
  } else {
    await prisma.emailTemplateLang.create({
      data: {
        parentId: templateId,
        lang,
        subject,
        content,
        createdAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}

