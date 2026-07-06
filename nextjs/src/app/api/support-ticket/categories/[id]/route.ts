import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeStTicketCategory } from "@/lib/support-ticket-serialize";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const cat = await prisma.stTicketCategory.update({
      where: { id: BigInt(id) },
      data: { name: body.name, color: body.color, updatedAt: new Date() },
    });
    return NextResponse.json({ data: serializeStTicketCategory(cat), message: "Category updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.stTicketCategory.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ message: "Category deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
