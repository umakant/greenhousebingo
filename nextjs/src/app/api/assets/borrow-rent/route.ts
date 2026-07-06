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
        { userId: { contains: search, mode: "insensitive" } },
        { asset: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (status && status !== "all") where.status = status;
    if (assetId && assetId !== "all") where.assetId = BigInt(assetId);

    const [data, total] = await Promise.all([
      prisma.assetBorrowRent.findMany({
        where,
        include: {
          asset: { select: { id: true, name: true, serialCode: true } },
          _count: { select: { payments: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.assetBorrowRent.count({ where }),
    ]);

    return jsonR({ data, total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load borrow & rent records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { asset_id, user_id, start_date, end_date, actual_return_date, rent_quantity, purpose, status } = body;

    if (!asset_id) return jsonR({ error: "Asset is required" }, { status: 422 });
    if (!user_id?.trim()) return jsonR({ error: "User/borrower name is required" }, { status: 422 });
    if (!start_date) return jsonR({ error: "Start date is required" }, { status: 422 });
    if (!end_date) return jsonR({ error: "End date is required" }, { status: 422 });

    const record = await prisma.assetBorrowRent.create({
      data: {
        assetId: BigInt(asset_id),
        userId: user_id.trim(),
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        actualReturnDate: actual_return_date ? new Date(actual_return_date) : null,
        rentQuantity: rent_quantity ? parseInt(rent_quantity) : 1,
        purpose: purpose ?? null,
        status: status ?? "draft",
      },
      include: { asset: { select: { id: true, name: true, serialCode: true } } },
    });

    return jsonR({ data: record, message: "Borrow & rent record created successfully" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to create borrow & rent record" }, { status: 500 });
  }
}
