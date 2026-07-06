import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const contact = await prisma.waContact.findUnique({
      where: { id: BigInt(id) },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return jsonR(contact);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch contact" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.waContact.delete({ where: { id: BigInt(id) } });
    return jsonR({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete contact" }, { status: 500 });
  }
}
