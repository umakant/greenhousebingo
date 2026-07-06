import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

const FIELDS = [
  "confirmed",
  "whatsapp",
  "housing",
  "attire",
  "meals",
  "parking",
  "policy",
  "check_in",
  "hotel_security",
] as const;

const FIELD_MAP: Record<string, string> = {
  confirmed: "confirmed",
  whatsapp: "whatsapp",
  housing: "housing",
  attire: "attire",
  meals: "meals",
  parking: "parking",
  policy: "policy",
  check_in: "checkIn",
  hotel_security: "hotelSecurity",
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const agents = await prisma.projectStaffAssignment.findMany({
    where: { projectId, role: "agent" },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const userIds = agents.map((a) => a.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const checklists = await prisma.projectAgentChecklist.findMany({ where: { projectId } });
  const checklistMap = new Map(checklists.map((c) => [c.userId, c]));

  return NextResponse.json({
    data: agents.map((a) => {
      const u = userMap.get(a.userId);
      const c = checklistMap.get(a.userId);
      return {
        user_id: Number(a.userId),
        name: u?.name ?? u?.email ?? "Unknown",
        confirmed: c?.confirmed ?? false,
        whatsapp: c?.whatsapp ?? false,
        housing: c?.housing ?? false,
        attire: c?.attire ?? false,
        meals: c?.meals ?? false,
        parking: c?.parking ?? false,
        policy: c?.policy ?? false,
        check_in: c?.checkIn ?? false,
        hotel_security: c?.hotelSecurity ?? false,
      };
    }),
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const userId = body?.user_id != null ? Number(body.user_id) : NaN;
  const field = typeof body?.field === "string" ? body.field : "";
  if (!Number.isFinite(userId) || !FIELDS.includes(field as typeof FIELDS[number])) {
    return NextResponse.json({ error: "user_id and valid field required" }, { status: 400 });
  }

  const prismaField = FIELD_MAP[field];
  const value = Boolean(body?.value);

  const updated = await prisma.projectAgentChecklist.upsert({
    where: {
      projectId_userId: { projectId, userId: BigInt(userId) },
    },
    create: {
      projectId,
      userId: BigInt(userId),
      [prismaField]: value,
    },
    update: {
      [prismaField]: value,
    },
  });

  return NextResponse.json({
    data: {
      user_id: Number(updated.userId),
      confirmed: updated.confirmed,
      whatsapp: updated.whatsapp,
      housing: updated.housing,
      attire: updated.attire,
      meals: updated.meals,
      parking: updated.parking,
      policy: updated.policy,
      check_in: updated.checkIn,
      hotel_security: updated.hotelSecurity,
    },
  });
}
