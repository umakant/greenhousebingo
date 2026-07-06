import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStructuralFieldType } from "@/components/form-builder/form-field-types";
import { collectFieldErrors } from "@/lib/form-field-validation";
import { getSuperadminDateDisplayPrefs } from "@/lib/settings-service";
import { processFormConversionAfterSubmit } from "@/lib/storefront/form-crm";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const form = await prisma.form.findFirst({
      where: { code, isActive: true },
      include: { fields: { orderBy: { order: "asc" } } },
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });
    const datePrefs = await getSuperadminDateDisplayPrefs();
    return NextResponse.json({
      id: form.id.toString(),
      name: form.name,
      defaultLayout: form.defaultLayout,
      dateFormat: datePrefs.dateFormat,
      calendarStartDay: datePrefs.calendarStartDay,
      fields: form.fields.map(f => ({
        id: f.id.toString(),
        label: f.label,
        type: f.type,
        required: f.required,
        placeholder: f.placeholder ?? "",
        options: f.options != null ? f.options : [],
        order: f.order,
      })),
    });
  } catch { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = await req.json().catch(() => null);

  try {
    const form = await prisma.form.findFirst({
      where: { code, isActive: true },
      include: { fields: true, conversion: true },
    });
    if (!form) return NextResponse.json({ error: "Form not found" }, { status: 404 });

    const rawBody = (body ?? {}) as Record<string, unknown>;
    const fieldErrors = collectFieldErrors(
      form.fields.map((f) => ({
        id: f.id.toString(),
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options,
      })),
      rawBody,
    );
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        { error: "Please correct the errors below and try again.", fieldErrors },
        { status: 422 },
      );
    }

    // Build response data object
    const responseData: Record<string, any> = {};
    for (const field of form.fields) {
      if (isStructuralFieldType(field.type)) continue;
      responseData[field.label] = rawBody[`field_${field.id}`] ?? null;
    }

    // Save response
    const response = await prisma.formResponse.create({
      data: {
        formId: form.id,
        responseData,
        submitterIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      },
    });

    const orgId = form.createdBy;
    if (orgId) {
      const widRaw =
        (typeof rawBody.websiteId === "string" && rawBody.websiteId) ||
        (typeof rawBody.website_id === "string" && rawBody.website_id) ||
        req.nextUrl.searchParams.get("websiteId");
      let websiteId: bigint | null = null;
      if (widRaw && /^\d+$/.test(String(widRaw))) {
        try {
          websiteId = BigInt(String(widRaw));
        } catch {
          websiteId = null;
        }
      }
      const pageSlug =
        typeof rawBody.pageSlug === "string"
          ? rawBody.pageSlug
          : typeof rawBody.page_slug === "string"
            ? rawBody.page_slug
            : req.nextUrl.searchParams.get("pageSlug");
      void processFormConversionAfterSubmit({
        formId: form.id,
        organizationId: orgId,
        responseId: response.id,
        responseData,
        websiteId,
        pageSlug: pageSlug?.trim() || null,
      }).catch(() => {
        /* non-blocking */
      });
    }

    return NextResponse.json({ ok: true, id: response.id.toString() }, { status: 201 });
  } catch { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
