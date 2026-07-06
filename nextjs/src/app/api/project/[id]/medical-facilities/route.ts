import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

const TYPES = new Set(["hospital", "urgent_care", "pharmacy"]);

function serialize(row: {
  id: bigint;
  facilityType: string;
  name: string;
  address: string | null;
  phone: string | null;
  distance: string | null;
  notes: string | null;
}) {
  return {
    id: Number(row.id),
    facility_type: row.facilityType,
    name: row.name,
    address: row.address,
    phone: row.phone,
    distance: row.distance,
    notes: row.notes,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const rows = await prisma.projectMedicalFacility.findMany({
    where: { projectId },
    orderBy: [{ facilityType: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ data: rows.map(serialize) });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const facilityType = typeof body?.facility_type === "string" ? body.facility_type : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!TYPES.has(facilityType) || !name) {
    return NextResponse.json({ error: "facility_type and name required" }, { status: 400 });
  }

  const row = await prisma.projectMedicalFacility.create({
    data: {
      projectId,
      facilityType,
      name,
      address: typeof body?.address === "string" ? body.address : null,
      phone: typeof body?.phone === "string" ? body.phone : null,
      distance: typeof body?.distance === "string" ? body.distance : null,
      notes: typeof body?.notes === "string" ? body.notes : null,
    },
  });
  await logProjectActivity(projectId, auth.actor.id, auth.actor.type ?? "user", "medical_facility", `Added facility ${name}`);
  return NextResponse.json({ data: serialize(row) });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const rowId = body?.id != null ? Number(body.id) : NaN;
  if (!Number.isFinite(rowId)) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updated = await prisma.projectMedicalFacility.update({
    where: { id: BigInt(rowId) },
    data: {
      facilityType: typeof body?.facility_type === "string" && TYPES.has(body.facility_type) ? body.facility_type : undefined,
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      address: body?.address !== undefined ? (body.address as string | null) : undefined,
      phone: body?.phone !== undefined ? (body.phone as string | null) : undefined,
      distance: body?.distance !== undefined ? (body.distance as string | null) : undefined,
      notes: body?.notes !== undefined ? (body.notes as string | null) : undefined,
    },
  });
  if (Number(updated.projectId) !== Number(projectId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ data: serialize(updated) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rowId = req.nextUrl.searchParams.get("id");
  if (!rowId) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.projectMedicalFacility.deleteMany({ where: { id: BigInt(rowId), projectId } });
  return NextResponse.json({ ok: true });
}
