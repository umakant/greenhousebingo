import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-appointment-settings", "manage-appointment", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  try {
    const rows = await prisma.appointmentSetting.findMany({ where: { createdBy: companyId } });
    const settings: Record<string, string | null> = {};
    for (const r of rows) settings[r.key] = r.value;
    return jsonR({ data: settings });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-appointment-settings", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "object required" }, { status: 400 });
  try {
    for (const [key, value] of Object.entries(body)) {
      const existing = await prisma.appointmentSetting.findFirst({ where: { key, createdBy: companyId } });
      if (existing) {
        await prisma.appointmentSetting.update({ where: { id: existing.id }, data: { value: value as string } });
      } else {
        await prisma.appointmentSetting.create({ data: { key, value: value as string, createdBy: companyId } });
      }
    }
    return jsonR({ success: true });
  } catch { return serverError(); }
}
