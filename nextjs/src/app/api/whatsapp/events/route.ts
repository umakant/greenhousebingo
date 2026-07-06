import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const events = await prisma.waEventNotification.findMany({ orderBy: { id: "asc" } });
    return jsonR(events);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, isEnabled, template } = body;

    const updated = await prisma.waEventNotification.update({
      where: { event },
      data: { isEnabled, template, updatedAt: new Date() },
    });

    return jsonR(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}
