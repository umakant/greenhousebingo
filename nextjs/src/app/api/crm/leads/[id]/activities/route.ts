import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCrmActor,
  getCrmPerms,
  checkPerm,
  getCompanyId,
  jsonR,
  unauthorized,
  forbidden,
  serverError,
} from "@/lib/crm-auth";

const ACTIVITY_TYPES = ["note", "call", "email", "meeting", "task"];

/** List activities for a lead (newest first). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "manage-leads", "view-leads", "create-leads", "manage-crm")) return forbidden();

  try {
    const { id } = await params;
    const cid = getCompanyId(actor);
    const lead = await prisma.crmLead.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      select: { id: true },
    });
    if (!lead) return jsonR({ ok: false, message: "Lead not found" }, 404);

    const activities = await prisma.crmLeadActivity.findMany({
      where: { leadId: lead.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const userIds = Array.from(
      new Set(activities.map((a) => a.userId).filter(Boolean) as bigint[]),
    );
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const nameById = new Map(users.map((u) => [u.id.toString(), u.name]));

    return jsonR({
      ok: true,
      data: activities.map((a) => ({
        id: a.id,
        type: a.type,
        note: a.note,
        userId: a.userId,
        userName: a.userId ? (nameById.get(a.userId.toString()) ?? null) : null,
        createdAt: a.createdAt,
      })),
    });
  } catch (e) {
    return serverError(e);
  }
}

/** Add an activity (note/call/email/meeting/task) to a lead. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCrmActor(req);
  if (!actor) return unauthorized();
  const perms = await getCrmPerms(req);
  if (!checkPerm(perms, "edit-leads", "manage-leads", "create-leads", "manage-crm")) return forbidden();

  try {
    const { id } = await params;
    const cid = getCompanyId(actor);
    const lead = await prisma.crmLead.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      select: { id: true },
    });
    if (!lead) return jsonR({ ok: false, message: "Lead not found" }, 404);

    const body = (await req.json().catch(() => ({}))) as { type?: unknown; note?: unknown };
    const note = String(body.note ?? "").trim();
    if (!note) return jsonR({ ok: false, message: "Note is required" }, 422);
    const type = ACTIVITY_TYPES.includes(String(body.type)) ? String(body.type) : "note";

    const activity = await prisma.crmLeadActivity.create({
      data: { leadId: lead.id, userId: actor.id, type, note },
    });

    return jsonR({ ok: true, data: { id: activity.id, type: activity.type, note: activity.note, createdAt: activity.createdAt } }, 201);
  } catch (e) {
    return serverError(e);
  }
}
