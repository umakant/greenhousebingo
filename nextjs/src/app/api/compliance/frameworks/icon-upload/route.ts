import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { saveComplianceFrameworkIconFile } from "@/lib/compliance/compliance-framework-icon-upload";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-frameworks");
  if (!gate.ok) return gate.response;

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, message: "Expected multipart/form-data with a file." }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "No file provided." }, { status: 400 });
  }

  try {
    const saved = await saveComplianceFrameworkIconFile(file);
    return NextResponse.json({ ok: true, url: saved.url, storage: saved.storage });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    const status = message.includes("Unsupported") || message.includes("between") ? 400 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
