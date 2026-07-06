import { NextResponse, type NextRequest } from "next/server";
import { htmlToPdfBuffer } from "@/lib/html-to-pdf-server";
import { getProjectOpsContext } from "@/lib/project-operations-api";
import { renderSowHtml } from "@/lib/project-sow";
import { formDataToSowRecord, mergeSowFormData, parseFormDataJson, type SowFormData } from "@/lib/project-sow-form";
import { loadSowFormForEmployee } from "@/lib/project-sow-load";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function buildSowPdfResponse(opts: {
  projectId: bigint;
  userId: bigint;
  companyId: bigint;
  formOverride?: Partial<SowFormData> | null;
}) {
  const loaded = await loadSowFormForEmployee({
    projectId: opts.projectId,
    userId: opts.userId,
    companyId: opts.companyId,
  });
  if ("error" in loaded) return loaded;

  const { staff, projectCtx, form: savedForm, row } = loaded;
  const form = opts.formOverride
    ? mergeSowFormData(parseFormDataJson(opts.formOverride) ?? opts.formOverride, savedForm)
    : savedForm;
  const sow = formDataToSowRecord(form);

  const html = renderSowHtml({
    employeeName: staff.name,
    project: projectCtx,
    sow: {
      ...sow,
      status: row?.status ?? "draft",
      signed_at: row?.signedAt?.toISOString() ?? null,
      signed_file_path: row?.signedFilePath ?? null,
    },
    form,
    signatoryName: form.signatory_name || form.vendor_contact_name || projectCtx.company_name || undefined,
    vendorCompany: form.vendor_company_name || projectCtx.company_name || undefined,
    vendorLogoUrl: form.vendor_logo_url || undefined,
  });

  const safeName = staff.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  const filename = `sow-${safeName}.pdf`;

  try {
    const pdf = await htmlToPdfBuffer(html);
    return {
      pdf,
      filename,
    };
  } catch (err) {
    console.error("[sow/pdf] PDF generation failed:", err);
    return { error: "Failed to generate PDF", status: 500 as const };
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId: userIdParam } = await ctx.params;
  const projectId = BigInt(id);
  const userId = BigInt(userIdParam);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const result = await buildSowPdfResponse({
    projectId,
    userId,
    companyId: auth.companyId,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(new Uint8Array(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId: userIdParam } = await ctx.params;
  const projectId = BigInt(id);
  const userId = BigInt(userIdParam);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const formOverride =
    body && typeof body === "object" && body.form && typeof body.form === "object"
      ? (body.form as Partial<SowFormData>)
      : null;

  const result = await buildSowPdfResponse({
    projectId,
    userId,
    companyId: auth.companyId,
    formOverride,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(new Uint8Array(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
