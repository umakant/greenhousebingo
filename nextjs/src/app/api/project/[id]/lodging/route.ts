import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const hotels = await prisma.projectLodgingHotel.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
  const assignments = await prisma.projectLodgingAssignment.findMany({
    where: { projectId },
  });
  const userIds = assignments.map((a) => a.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  const hotelMap = new Map(hotels.map((h) => [h.id, h]));

  return NextResponse.json({
    hotels: hotels.map((h) => ({
      id: Number(h.id),
      name: h.name,
      address: h.address,
    })),
    assignments: assignments.map((a) => {
      const u = userMap.get(a.userId);
      const hotel = hotelMap.get(a.hotelId);
      return {
        id: Number(a.id),
        hotel_id: Number(a.hotelId),
        hotel_name: hotel?.name ?? "",
        user_id: Number(a.userId),
        name: u?.name ?? u?.email ?? "",
        role: a.role,
        room: a.room,
      };
    }),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const type = typeof body?.type === "string" ? body.type : "hotel";

  if (type === "hotel") {
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const hotel = await prisma.projectLodgingHotel.create({
      data: {
        projectId,
        name,
        address: typeof body?.address === "string" ? body.address : null,
      },
    });
    await logProjectActivity(projectId, auth.actor.id, auth.actor.type ?? "user", "lodging_hotel", `Added hotel ${name}`);
    return NextResponse.json({
      data: { id: Number(hotel.id), name: hotel.name, address: hotel.address },
    });
  }

  if (type === "assignment") {
    const hotelId = body?.hotel_id != null ? Number(body.hotel_id) : NaN;
    const userId = body?.user_id != null ? Number(body.user_id) : NaN;
    const role = typeof body?.role === "string" ? body.role : "agent";
    if (!Number.isFinite(hotelId) || !Number.isFinite(userId)) {
      return NextResponse.json({ error: "hotel_id and user_id required" }, { status: 400 });
    }
    const row = await prisma.projectLodgingAssignment.create({
      data: {
        projectId,
        hotelId: BigInt(hotelId),
        userId: BigInt(userId),
        role,
        room: typeof body?.room === "string" ? body.room : null,
      },
    });
    return NextResponse.json({
      data: {
        id: Number(row.id),
        hotel_id: Number(row.hotelId),
        user_id: Number(row.userId),
        role: row.role,
        room: row.room,
      },
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const assignmentId = body?.assignment_id != null ? Number(body.assignment_id) : NaN;
  if (!Number.isFinite(assignmentId)) return NextResponse.json({ error: "assignment_id required" }, { status: 400 });

  const updated = await prisma.projectLodgingAssignment.update({
    where: { id: BigInt(assignmentId) },
    data: {
      room: typeof body?.room === "string" ? body.room : undefined,
      hotelId: body?.hotel_id != null ? BigInt(Number(body.hotel_id)) : undefined,
    },
  });
  if (Number(updated.projectId) !== Number(projectId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hotelId = req.nextUrl.searchParams.get("hotel_id");
  const assignmentId = req.nextUrl.searchParams.get("assignment_id");

  if (assignmentId) {
    await prisma.projectLodgingAssignment.deleteMany({
      where: { id: BigInt(assignmentId), projectId },
    });
    return NextResponse.json({ ok: true });
  }
  if (hotelId) {
    await prisma.projectLodgingAssignment.deleteMany({ where: { hotelId: BigInt(hotelId), projectId } });
    await prisma.projectLodgingHotel.deleteMany({ where: { id: BigInt(hotelId), projectId } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "hotel_id or assignment_id required" }, { status: 400 });
}
