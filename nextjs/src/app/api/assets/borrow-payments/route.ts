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

    const where: any = {};
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { referenceNumber: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status && status !== "all") where.status = status;

    const [data, total] = await Promise.all([
      prisma.assetBorrowPayment.findMany({
        where,
        include: {
          borrowRent: {
            select: {
              id: true,
              userId: true,
              asset: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.assetBorrowPayment.count({ where }),
    ]);

    return jsonR({ data, total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { borrow_rent_id, asset_id, customer_name, payment_amount, payment_date, reference_number, status, notes } = body;

    if (!borrow_rent_id) return jsonR({ error: "Borrow/rent record is required" }, { status: 422 });
    if (!customer_name?.trim()) return jsonR({ error: "Customer name is required" }, { status: 422 });
    if (!payment_amount) return jsonR({ error: "Payment amount is required" }, { status: 422 });
    if (!payment_date) return jsonR({ error: "Payment date is required" }, { status: 422 });

    const borrowRent = await prisma.assetBorrowRent.findUnique({
      where: { id: BigInt(borrow_rent_id) },
      select: { assetId: true },
    });

    const payment = await prisma.assetBorrowPayment.create({
      data: {
        borrowRentId: BigInt(borrow_rent_id),
        assetId: asset_id ? BigInt(asset_id) : (borrowRent?.assetId ?? BigInt(0)),
        customerName: customer_name.trim(),
        paymentAmount: parseFloat(payment_amount),
        paymentDate: new Date(payment_date),
        referenceNumber: reference_number ?? null,
        status: status ?? "draft",
        notes: notes ?? null,
      },
    });

    return jsonR({ data: payment, message: "Payment created successfully" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to create payment" }, { status: 500 });
  }
}
