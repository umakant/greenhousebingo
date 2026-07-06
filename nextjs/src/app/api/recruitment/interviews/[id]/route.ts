import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, notFound, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-interviews", "view-interviews")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recInterview.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      include: { candidate: true, job: true, round: true, interviewType: true, feedbacks: true },
    });
    if (!rec) return notFound();
    return jsonR(rec);
  } catch (e) { console.error(e); return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "edit-interviews")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recInterview.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    const body = await req.json();
    const updated = await prisma.recInterview.update({
      where: { id: BigInt(id) },
      data: {
        scheduledDate: body.scheduled_date ?? rec.scheduledDate,
        scheduledTime: body.scheduled_time ?? rec.scheduledTime,
        duration: body.duration !== undefined ? (body.duration ? Number(body.duration) : null) : rec.duration,
        location: body.location !== undefined ? body.location : rec.location,
        meetingLink: body.meeting_link !== undefined ? body.meeting_link : rec.meetingLink,
        status: body.status ?? rec.status,
        interviewTypeId: body.interview_type_id !== undefined ? (body.interview_type_id ? BigInt(body.interview_type_id) : null) : rec.interviewTypeId,
        roundId: body.round_id !== undefined ? (body.round_id ? BigInt(body.round_id) : null) : rec.roundId,
      },
    });
    return jsonR(updated);
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "delete-interviews")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recInterview.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    await prisma.recInterview.delete({ where: { id: BigInt(id) } });
    return jsonR({ success: true });
  } catch (e) { console.error(e); return serverError(); }
}
