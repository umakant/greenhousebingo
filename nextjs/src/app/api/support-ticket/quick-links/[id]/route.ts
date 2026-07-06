import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const item = await prisma.stQuickLink.update({
      where: { id: BigInt(id) },
      data: { title: body.title, icon: body.icon ?? null, link: body.link ?? null, updatedAt: new Date() },
    });
    return NextResponse.json({ data: item, message: "Quick link updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update quick link" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.stQuickLink.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ message: "Quick link deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete quick link" }, { status: 500 });
  }
}
