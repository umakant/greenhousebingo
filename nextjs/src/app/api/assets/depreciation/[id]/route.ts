import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { asset_id, method, useful_life, salvage_value, start_date, notes, status } = body;

    if (!asset_id) return jsonR({ error: "Asset is required" }, { status: 422 });
    if (!start_date) return jsonR({ error: "Start date is required" }, { status: 422 });

    const record = await prisma.assetDepreciation.update({
      where: { id: BigInt(id) },
      data: {
        assetId: BigInt(asset_id),
        method: method ?? "Straight Line",
        usefulLife: useful_life ? parseInt(useful_life) : 5,
        salvageValue: salvage_value ? parseFloat(salvage_value) : 0,
        startDate: new Date(start_date),
        notes: notes ?? null,
        status: status ?? "active",
        updatedAt: new Date(),
      },
    });

    return jsonR({ data: record, message: "Depreciation record updated successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to update depreciation record" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.assetDepreciation.delete({ where: { id: BigInt(id) } });
    return jsonR({ message: "Depreciation record deleted successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to delete depreciation record" }, { status: 500 });
  }
}
