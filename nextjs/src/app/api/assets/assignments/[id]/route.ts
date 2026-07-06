import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const assignment = await prisma.assetAssignment.findUnique({
      where: { id: BigInt(id) },
      include: { asset: { select: { id: true, name: true, serialCode: true } } },
    });
    if (!assignment) return jsonR({ error: "Assignment not found" }, { status: 404 });
    return jsonR({ data: assignment });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load assignment" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { asset_id, assigned_to, assigned_date, expected_return, status, condition, notes } = body;

    if (!asset_id) return jsonR({ error: "Asset is required" }, { status: 422 });
    if (!assigned_to?.trim()) return jsonR({ error: "Assigned to is required" }, { status: 422 });
    if (!assigned_date) return jsonR({ error: "Assigned date is required" }, { status: 422 });

    const assignment = await prisma.assetAssignment.update({
      where: { id: BigInt(id) },
      data: {
        assetId: BigInt(asset_id),
        assignedTo: assigned_to.trim(),
        assignedDate: new Date(assigned_date),
        expectedReturn: expected_return ? new Date(expected_return) : null,
        status: status ?? "active",
        condition: condition ?? "excellent",
        notes: notes ?? null,
        updatedAt: new Date(),
      },
      include: { asset: { select: { id: true, name: true, serialCode: true } } },
    });

    return jsonR({ data: assignment, message: "Assignment updated successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to update assignment" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.assetAssignment.delete({ where: { id: BigInt(id) } });
    return jsonR({ message: "Assignment deleted successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
