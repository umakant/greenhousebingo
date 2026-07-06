import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const contacts = await prisma.waContact.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {},
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonR(contacts);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, type, userId } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const contact = await prisma.waContact.create({
      data: {
        name: name || "Unknown",
        phone,
        type: type || "custom",
        userId: userId ? BigInt(userId) : null,
        updatedAt: new Date(),
      },
    });

    return jsonR(contact);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }
}
