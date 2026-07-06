import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, forbidden, unauthorized, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

function ser(r: any) {
  return { ...r, id: r.id.toString(), createdBy: r.createdBy?.toString() ?? null, creatorId: r.creatorId?.toString() ?? null };
}

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-questions", "manage-appointment", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const companyId = getCompanyId(actor);
  const { searchParams: s } = new URL(req.url);
  const page = Math.max(1, Number(s.get("page") ?? 1));
  const perPage = Math.min(200, Math.max(1, Number(s.get("per_page") ?? 15)));
  const skip = (page - 1) * perPage;
  const where: any = { createdBy: companyId };
  if (s.get("search")) where.questionName = { contains: s.get("search"), mode: "insensitive" };
  if (s.get("enabled") === "true") where.enabled = true;
  if (s.get("enabled") === "false") where.enabled = false;
  try {
    const [rows, total] = await Promise.all([
      prisma.question.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: perPage }),
      prisma.question.count({ where }),
    ]);
    return jsonR({ data: rows.map(ser), total, page, per_page: perPage, last_page: Math.ceil(total / perPage) || 1 });
  } catch { return serverError(); }
}

export async function POST(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "create-questions", "manage-questions", "*")) return forbidden();
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.question_name) return NextResponse.json({ error: "question_name required" }, { status: 400 });
  try {
    const row = await prisma.question.create({
      data: {
        questionName: body.question_name,
        questionType: body.question_type ?? "text",
        availableAnswers: body.available_answers ?? "",
        requiredAnswer: body.required_answer ?? false,
        enabled: body.enabled ?? true,
        creatorId: getCompanyId(actor),
        createdBy: getCompanyId(actor),
      },
    });
    return jsonR({ data: ser(row) }, { status: 201 });
  } catch { return serverError(); }
}
