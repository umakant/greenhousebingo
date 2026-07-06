import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.stCustomPage.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, slug, description, contents, enable_footer } = body;
    if (!title || !slug) return NextResponse.json({ error: "Title and slug are required" }, { status: 422 });
    const item = await prisma.stCustomPage.create({
      data: { title, slug, description: description ?? null, contents: contents ?? null, enableFooter: enable_footer ?? false },
    });
    return NextResponse.json({ data: item, message: "Custom page created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create custom page" }, { status: 500 });
  }
}
