import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const item = await prisma.stCustomPage.update({
      where: { id: BigInt(id) },
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description ?? null,
        contents: body.contents ?? null,
        enableFooter: body.enable_footer ?? false,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json({ data: item, message: "Custom page updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.stCustomPage.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ message: "Custom page deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
