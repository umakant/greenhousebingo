import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contactId = searchParams.get("contactId");
    if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

    const messages = await prisma.waMessage.findMany({
      where: { contactId: BigInt(contactId) },
      orderBy: { createdAt: "asc" },
    });

    return jsonR(messages);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId, message } = body;

    if (!contactId || !message) {
      return NextResponse.json({ error: "contactId and message are required" }, { status: 400 });
    }

    const msg = await prisma.waMessage.create({
      data: {
        contactId: BigInt(contactId),
        message,
        direction: "outbound",
        status: "sent",
      },
    });

    return jsonR(msg);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
