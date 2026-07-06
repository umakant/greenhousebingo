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
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.stContact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.stContact.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load contacts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;
    if (!name || !email || !subject) {
      return NextResponse.json({ error: "Name, email and subject are required" }, { status: 422 });
    }
    const item = await prisma.stContact.create({ data: { name, email, subject, message: message ?? null } });
    return NextResponse.json({ data: item, message: "Contact submitted" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to submit contact" }, { status: 500 });
  }
}
