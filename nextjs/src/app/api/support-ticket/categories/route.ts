import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeStTicketCategory } from "@/lib/support-ticket-serialize";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const perPage = parseInt(searchParams.get("per_page") ?? "100");
    const rows = await prisma.stTicketCategory.findMany({ orderBy: { name: "asc" }, take: perPage });
    const data = rows.map(serializeStTicketCategory);
    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, color } = body;
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 422 });
    const cat = await prisma.stTicketCategory.create({ data: { name, color: color ?? "#6366F1" } });
    return NextResponse.json({ data: serializeStTicketCategory(cat), message: "Category created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
