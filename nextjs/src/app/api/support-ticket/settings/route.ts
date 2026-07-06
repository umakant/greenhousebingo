import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") ?? "";
    const where: any = {};
    if (section) where.section = section;
    const rows = await prisma.stSetting.findMany({ where });
    const result: Record<string, Record<string, string | null>> = {};
    for (const row of rows) {
      if (!result[row.section]) result[row.section] = {};
      result[row.section][row.key] = row.value;
    }
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { section, settings } = body;
    if (!section || !settings) {
      return NextResponse.json({ error: "section and settings are required" }, { status: 422 });
    }
    for (const [key, value] of Object.entries(settings)) {
      await prisma.stSetting.upsert({
        where: { section_key: { section, key } },
        update: { value: value as string | null, updatedAt: new Date() },
        create: { section, key, value: value as string | null },
      });
    }
    return NextResponse.json({ message: "Settings saved successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
