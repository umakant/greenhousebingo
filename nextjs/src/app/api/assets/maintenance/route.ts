import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const perPage = Math.max(1, parseInt(searchParams.get("per_page") ?? "10"));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const priority = searchParams.get("priority") ?? "";
    const assetId = searchParams.get("asset_id") ?? "";

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { asset: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (status && status !== "all") where.status = status;
    if (priority && priority !== "all") where.priority = priority;
    if (assetId && assetId !== "all") where.assetId = BigInt(assetId);

    const [data, total] = await Promise.all([
      prisma.assetMaintenance.findMany({
        where,
        include: { asset: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.assetMaintenance.count({ where }),
    ]);

    return jsonR({ data, total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load maintenance records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      asset_id, type, title, description, scheduled_date, completed_date,
      cost, technician_name, status, priority, next_maintenance_date, notes,
    } = body;

    if (!asset_id) return jsonR({ error: "Asset is required" }, { status: 422 });
    if (!title?.trim()) return jsonR({ error: "Title is required" }, { status: 422 });

    const record = await prisma.assetMaintenance.create({
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
      },
      include: { asset: { select: { id: true, name: true } } },
    });

    return jsonR({ data: record, message: "Maintenance record created successfully" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to create maintenance record" }, { status: 500 });
  }
}
