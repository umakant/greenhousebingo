import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, notFound, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(r: any) {
  return { ...r, id: r.id.toString(), createdBy: r.createdBy?.toString() ?? null, creatorId: r.creatorId?.toString() ?? null };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-questions", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  try {
    const row = await prisma.question.findUnique({ where: { id: BigInt(id) } });
    if (!row) return notFound();
    return jsonR({ data: ser(row) });
  } catch { return serverError(); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "edit-questions", "manage-questions", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  const body = await req.json().catch(() => null);
  try {
    const data: any = {};
    if (body?.question_name !== undefined) data.questionName = body.question_name;
    if (body?.question_type !== undefined) data.questionType = body.question_type;
    if (body?.available_answers !== undefined) data.availableAnswers = body.available_answers;
    if (body?.required_answer !== undefined) data.requiredAnswer = body.required_answer;
    if (body?.enabled !== undefined) data.enabled = body.enabled;
    const row = await prisma.question.update({ where: { id: BigInt(id) }, data });
    return jsonR({ data: ser(row) });
  } catch { return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "delete-questions", "manage-questions", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const { id } = await params;
  try {
    await prisma.question.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ success: true });
  } catch { return serverError(); }
}
