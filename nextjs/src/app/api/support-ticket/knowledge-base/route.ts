import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const perPage = Math.max(1, parseInt(searchParams.get("per_page") ?? "10"));
    const search = searchParams.get("search") ?? "";

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.stKnowledgeBase.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.stKnowledgeBase.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load knowledge base" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category_id, description } = body;
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 422 });

    const item = await prisma.stKnowledgeBase.create({
      data: {
        title,
        categoryId: category_id ? BigInt(category_id) : null,
        description: description ?? null,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ data: item, message: "Knowledge base entry created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create knowledge base entry" }, { status: 500 });
  }
}
