import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name } = body;
    if (!name?.trim()) {
      return jsonR({ error: "Name is required" }, { status: 422 });
    }
    const existing = await prisma.assetCategory.findFirst({
      where: { name: name.trim(), NOT: { id: BigInt(id) } },
    });
    if (existing) {
      return jsonR({ error: "Category name already exists" }, { status: 422 });
    }
    const category = await prisma.assetCategory.update({
      where: { id: BigInt(id) },
      data: { name: name.trim(), updatedAt: new Date() },
    });
    return jsonR({ data: category, message: "Category updated successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.assetCategory.delete({ where: { id: BigInt(id) } });
    return jsonR({ message: "Category deleted successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to delete category" }, { status: 500 });
  }
}
