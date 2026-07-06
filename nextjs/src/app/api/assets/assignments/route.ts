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
    const assetId = searchParams.get("asset_id") ?? "";

    const where: any = {};
    if (search) {
      where.OR = [
        { assignedTo: { contains: search, mode: "insensitive" } },
        { asset: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (status && status !== "all") where.status = status;
    if (assetId && assetId !== "all") where.assetId = BigInt(assetId);

    const [data, total] = await Promise.all([
      prisma.assetAssignment.findMany({
        where,
        include: { asset: { select: { id: true, name: true, serialCode: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.assetAssignment.count({ where }),
    ]);

    return jsonR({ data, total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load assignments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { asset_id, assigned_to, assigned_date, expected_return, status, condition, notes } = body;

    if (!asset_id) return jsonR({ error: "Asset is required" }, { status: 422 });
    if (!assigned_to?.trim()) return jsonR({ error: "Assigned to is required" }, { status: 422 });
    if (!assigned_date) return jsonR({ error: "Assigned date is required" }, { status: 422 });

    const assignment = await prisma.assetAssignment.create({
      data: {
        assetId: BigInt(asset_id),
        assignedTo: assigned_to.trim(),
        assignedDate: new Date(assigned_date),
        expectedReturn: expected_return ? new Date(expected_return) : null,
        status: status ?? "active",
        condition: condition ?? "excellent",
        notes: notes ?? null,
      },
      include: { asset: { select: { id: true, name: true, serialCode: true } } },
    });

    return jsonR({ data: assignment, message: "Assignment created successfully" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to create assignment" }, { status: 500 });
  }
}
