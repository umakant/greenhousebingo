import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.stKnowledgeBase.findUnique({
      where: { id: BigInt(id) },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const item = await prisma.stKnowledgeBase.update({
      where: { id: BigInt(id) },
      data: {
        title: body.title,
        categoryId: body.category_id ? BigInt(body.category_id) : null,
        description: body.description ?? null,
        updatedAt: new Date(),
      },
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: item, message: "Knowledge base entry updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.stKnowledgeBase.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
