import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { customer_name, payment_amount, payment_date, reference_number, status, notes } = body;

    if (!customer_name?.trim()) return jsonR({ error: "Customer name is required" }, { status: 422 });
    if (!payment_amount) return jsonR({ error: "Payment amount is required" }, { status: 422 });
    if (!payment_date) return jsonR({ error: "Payment date is required" }, { status: 422 });

    const payment = await prisma.assetBorrowPayment.update({
      where: { id: BigInt(id) },
      data: {
        customerName: customer_name.trim(),
        paymentAmount: parseFloat(payment_amount),
        paymentDate: new Date(payment_date),
        referenceNumber: reference_number ?? null,
        status: status ?? "draft",
        notes: notes ?? null,
        updatedAt: new Date(),
      },
    });

    return jsonR({ data: payment, message: "Payment updated successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to update payment" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.assetBorrowPayment.delete({ where: { id: BigInt(id) } });
    return jsonR({ message: "Payment deleted successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to delete payment" }, { status: 500 });
  }
}
