import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-resume-builder", "manage-resume-builder-settings")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  const { searchParams: s } = new URL(req.url);
  const section = s.get("section") ?? "brand";
  const scopedSection = `${companyId}_${section}`;

  try {
    const rows = await prisma.resumeBuilderSetting.findMany({
      where: { section: scopedSection },
    });
    const settings: Record<string, string | null> = {};
    for (const r of rows) settings[r.key] = r.value ?? null;
    return jsonR({ data: settings });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-resume-builder", "manage-resume-builder-settings")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);

  try {
    const body = await req.json();
    const { section = "brand", settings } = body;
    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Settings object is required" }, { status: 400 });
    }
    const scopedSection = `${companyId}_${section}`;

    for (const [key, value] of Object.entries(settings)) {
      await prisma.resumeBuilderSetting.upsert({
        where: { section_key: { section: scopedSection, key } },
        update: { value: value as string ?? null, updatedAt: new Date() },
        create: { section: scopedSection, key, value: value as string ?? null },
      });
    }
    return jsonR({ success: true });
  } catch { return serverError(); }
}
