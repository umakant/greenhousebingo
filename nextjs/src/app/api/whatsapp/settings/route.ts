import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const settings = await prisma.waSetting.findMany({ orderBy: { key: "asc" } });
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value || "";
    }
    return jsonR(map);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    for (const [key, value] of Object.entries(body)) {
      await prisma.waSetting.upsert({
        where: { key },
        update: { value: String(value ?? ""), updatedAt: new Date() },
        create: { key, value: String(value ?? "") },
      });
    }
    return jsonR({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
