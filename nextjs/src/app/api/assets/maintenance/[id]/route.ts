import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await prisma.assetMaintenance.findUnique({
      where: { id: BigInt(id) },
      include: { asset: { select: { id: true, name: true } } },
    });
    if (!record) return jsonR({ error: "Maintenance record not found" }, { status: 404 });
    return jsonR({ data: record });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load maintenance record" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      asset_id, type, title, description, scheduled_date, completed_date,
      cost, technician_name, status, priority, next_maintenance_date, notes,
    } = body;

    if (!asset_id) return jsonR({ error: "Asset is required" }, { status: 422 });
    if (!title?.trim()) return jsonR({ error: "Title is required" }, { status: 422 });

    const record = await prisma.assetMaintenance.update({
      where: { id: BigInt(id) },
      data: {
        assetId: BigInt(asset_id),
        type: type ?? "Preventive",
        title: title.trim(),
        description: description ?? null,
        scheduledDate: scheduled_date ? new Date(scheduled_date) : null,
        completedDate: completed_date ? new Date(completed_date) : null,
        cost: cost ? parseFloat(cost) : null,
        technicianName: technician_name ?? null,
        status: status ?? "Scheduled",
        priority: priority ?? "Medium",
        nextMaintenanceDate: next_maintenance_date ? new Date(next_maintenance_date) : null,
        notes: notes ?? null,
        updatedAt: new Date(),
      },
      include: { asset: { select: { id: true, name: true } } },
    });

    return jsonR({ data: record, message: "Maintenance record updated successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to update maintenance record" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.assetMaintenance.delete({ where: { id: BigInt(id) } });
    return jsonR({ message: "Maintenance record deleted successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to delete maintenance record" }, { status: 500 });
  }
}
