import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeStFaq } from "@/lib/support-ticket-serialize";

function isMissingFaqTableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /st_faqs.+(does not exist|undefined table)/i.test(msg);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const perPage = Math.max(1, parseInt(searchParams.get("per_page") ?? "10"));
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { answer: { contains: search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.stFaq.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.stFaq.count({ where }),
    ]);

    return NextResponse.json({
      data: rows.map(serializeStFaq),
      total,
      page,
      per_page: perPage,
    });
  } catch (err) {
    console.error("[support-ticket/faq GET]", err);
    if (isMissingFaqTableError(err)) {
      return NextResponse.json({
        error: "FAQ storage is unavailable. Run node scripts/ensure-st-faqs-schema.js",
      }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to load FAQ" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const answer =
      typeof body.answer === "string" && body.answer.trim().length > 0 ? body.answer.trim() : null;
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 422 });

    const item = await prisma.stFaq.create({
      data: { title, answer },
    });
    return NextResponse.json({ data: serializeStFaq(item), message: "FAQ created" }, { status: 201 });
  } catch (err) {
    console.error("[support-ticket/faq POST]", err);
    if (isMissingFaqTableError(err)) {
      return NextResponse.json({
        error: "FAQ storage is unavailable. Run node scripts/ensure-st-faqs-schema.js",
      }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
  }
}
