import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const perPage = Math.max(1, parseInt(searchParams.get("per_page") ?? "20"));

    const where: any = {};
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [data, total] = await Promise.all([
      prisma.assetCategory.findMany({
        where,
        include: { _count: { select: { assets: true } } },
        orderBy: { name: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.assetCategory.count({ where }),
    ]);

    return jsonR({ data, total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name } = body;
    if (!name?.trim()) {
      return jsonR({ error: "Name is required" }, { status: 422 });
    }
    const existing = await prisma.assetCategory.findFirst({ where: { name: name.trim() } });
    if (existing) {
      return jsonR({ error: "Category name already exists" }, { status: 422 });
    }
    const category = await prisma.assetCategory.create({ data: { name: name.trim() } });
    return jsonR({ data: category, message: "Category created successfully" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to create category" }, { status: 500 });
  }
}
