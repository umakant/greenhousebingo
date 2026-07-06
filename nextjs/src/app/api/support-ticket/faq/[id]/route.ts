import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeStFaq } from "@/lib/support-ticket-serialize";

function isMissingFaqTableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /st_faqs.+(does not exist|undefined table)/i.test(msg);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const answer =
      typeof body.answer === "string" && body.answer.trim().length > 0 ? body.answer.trim() : null;
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 422 });

    const item = await prisma.stFaq.update({
      where: { id: BigInt(id) },
      data: { title, answer, updatedAt: new Date() },
    });
    return NextResponse.json({ data: serializeStFaq(item), message: "FAQ updated" });
  } catch (err) {
    console.error("[support-ticket/faq PUT]", err);
    if (isMissingFaqTableError(err)) {
      return NextResponse.json({
        error: "FAQ storage is unavailable. Run node scripts/ensure-st-faqs-schema.js",
      }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.stFaq.delete({ where: { id: BigInt(id) } });
    return NextResponse.json({ message: "FAQ deleted" });
  } catch (err) {
    console.error("[support-ticket/faq DELETE]", err);
    if (isMissingFaqTableError(err)) {
      return NextResponse.json({
        error: "FAQ storage is unavailable. Run node scripts/ensure-st-faqs-schema.js",
      }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
  }
}
