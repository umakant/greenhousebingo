import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

export const dynamic = "force-dynamic";

function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

async function getActor(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return null;
  return prisma.user.findFirst({ where: { email }, select: { id: true, type: true, createdBy: true } });
}

function canManage(req: NextRequest) {
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  return perms.includes("*") || perms.includes("manage-project") || perms.includes("manage-project-task");
}

export async function GET(req: NextRequest) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = getCompanyId(actor);
  const stages = await prisma.taskStage.findMany({
    where: { createdBy: companyId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(stages.map((s) => ({
    id: Number(s.id), name: s.name, color: s.color,
    complete: s.complete, order: s.order,
  })));
}

export async function POST(req: NextRequest) {
  if (!canManage(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = getCompanyId(actor);
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const maxOrder = await prisma.taskStage.aggregate({ where: { createdBy: companyId }, _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const stage = await prisma.taskStage.create({
    data: {
      name: String(body.name).trim(),
      color: body.color ? String(body.color) : "#051c4b",
      complete: body.complete === true || body.complete === "true",
      order: nextOrder,
      creatorId: actor.id,
      createdBy: companyId,
    },
  });
  return NextResponse.json({ ok: true, id: Number(stage.id), name: stage.name, color: stage.color, complete: stage.complete, order: stage.order });
}
