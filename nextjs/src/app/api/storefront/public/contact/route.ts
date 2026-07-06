import { NextRequest, NextResponse } from "next/server";

import { getPublicStorefrontContextFromHost } from "@/lib/storefront/public-host-context";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const ctx = await getPublicStorefrontContextFromHost(host);
  if (!ctx) return NextResponse.json({ ok: false, error: "Store not found for this host" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = body?.name != null ? String(body.name).trim() : "";
  const email = body?.email != null ? String(body.email).trim().toLowerCase() : "";
  const phone = body?.phone != null ? String(body.phone).trim() : "";
  const subject = body?.subject != null ? String(body.subject).trim() : "";
  const message = body?.message != null ? String(body.message).trim() : "";

  if (!name || name.length > 200) {
    return NextResponse.json({ ok: false, error: "Name is required (max 200 characters)." }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }
  if (phone.length > 80) {
    return NextResponse.json({ ok: false, error: "Phone number is too long." }, { status: 400 });
  }
  if (!subject || subject.length > 200) {
    return NextResponse.json({ ok: false, error: "Subject is required." }, { status: 400 });
  }
  if (!message || message.length > 8000) {
    return NextResponse.json({ ok: false, error: "Message is required (max 8000 characters)." }, { status: 400 });
  }

  console.info("[storefront-contact]", {
    organizationId: ctx.organizationId.toString(),
    websiteId: ctx.websiteId.toString(),
    name,
    email,
    phone: phone || undefined,
    subject,
    messagePreview: message.slice(0, 200),
  });

  return NextResponse.json({ ok: true });
}
