import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const record = await prisma.assetBorrowRent.findUnique({
      where: { id: BigInt(id) },
      include: {
        asset: { select: { id: true, name: true, serialCode: true } },
        payments: true,
      },
    });
    if (!record) return jsonR({ error: "Record not found" }, { status: 404 });
    return jsonR({ data: record });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load record" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { asset_id, user_id, start_date, end_date, actual_return_date, rent_quantity, purpose, status } = body;

    if (!asset_id) return jsonR({ error: "Asset is required" }, { status: 422 });
    if (!user_id?.trim()) return jsonR({ error: "User/borrower name is required" }, { status: 422 });
    if (!start_date) return jsonR({ error: "Start date is required" }, { status: 422 });
    if (!end_date) return jsonR({ error: "End date is required" }, { status: 422 });

    const record = await prisma.assetBorrowRent.update({
      where: { id: BigInt(id) },
      data: {
        assetId: BigInt(asset_id),
        userId: user_id.trim(),
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        actualReturnDate: actual_return_date ? new Date(actual_return_date) : null,
        rentQuantity: rent_quantity ? parseInt(rent_quantity) : 1,
        purpose: purpose ?? null,
        status: status ?? "draft",
        updatedAt: new Date(),
      },
      include: { asset: { select: { id: true, name: true, serialCode: true } } },
    });

    return jsonR({ data: record, message: "Record updated successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.assetBorrowRent.delete({ where: { id: BigInt(id) } });
    return jsonR({ message: "Record deleted successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to delete record" }, { status: 500 });
  }
}
