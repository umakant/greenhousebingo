import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.stQuickLink.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, icon, link } = body;
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 422 });
    const item = await prisma.stQuickLink.create({ data: { title, icon: icon ?? null, link: link ?? null } });
    return NextResponse.json({ data: item, message: "Quick link created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create quick link" }, { status: 500 });
  }
}
