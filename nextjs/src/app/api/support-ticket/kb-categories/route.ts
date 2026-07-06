import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeKbCategory } from "@/lib/support-ticket-serialize";

export async function GET() {
  try {
    const rows = await prisma.stKnowledgeBaseCategory.findMany({ orderBy: { name: "asc" } });
    const data = rows.map(serializeKbCategory);
    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 422 });
    const cat = await prisma.stKnowledgeBaseCategory.create({ data: { name } });
    return NextResponse.json({ data: serializeKbCategory(cat), message: "Category created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
