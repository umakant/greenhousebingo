import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(r: any) {
  return { ...r, id: r.id.toString(), createdBy: r.createdBy?.toString() ?? null, creatorId: r.creatorId?.toString() ?? null };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-appointments", "view-appointments", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const row = await prisma.appointment.findUnique({ where: { id: BigInt(id) } });
    if (!row) return notFound();
    return jsonR({ data: ser(row) });
  } catch { return serverError(); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "edit-appointments", "manage-appointments", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  try {
    const data: any = {};
    if (body?.appointment_name !== undefined) data.appointmentName = body.appointment_name;
    if (body?.appointment_type !== undefined) data.appointmentType = body.appointment_type;
    if (body?.week_day !== undefined) data.weekDay = body.week_day;
    if (body?.duration !== undefined) data.duration = body.duration ? Number(body.duration) : null;
    if (body?.phone_enabled !== undefined) data.phoneEnabled = body.phone_enabled;
    if (body?.question_ids !== undefined) data.questionIds = body.question_ids;
    if (body?.enabled !== undefined) data.enabled = body.enabled;
    const row = await prisma.appointment.update({ where: { id: BigInt(id) }, data });
    return jsonR({ data: ser(row) });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "delete-appointments", "manage-appointments", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  try {
    await prisma.appointment.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ success: true });
  } catch { return serverError(); }
}
