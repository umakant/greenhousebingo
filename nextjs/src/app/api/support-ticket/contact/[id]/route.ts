import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await prisma.stContact.findUnique({ where: { id: BigInt(id) } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.stContact.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ message: "Contact deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
