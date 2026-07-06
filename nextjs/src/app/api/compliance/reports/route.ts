import { NextResponse, type NextRequest } from "next/server";

import { requireComplianceApiAccess } from "@/lib/compliance/compliance-api-access";
import { COMPLIANCE_REPORT_TYPES, type ComplianceReportType } from "@/lib/compliance/compliance-day4";
import {
  buildComplianceReport,
  reportExportContent,
} from "@/lib/compliance/compliance-reporting";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireComplianceApiAccess(req, "manage-compliance-reports");
  if (!gate.ok) return gate.response;

  const type = (req.nextUrl.searchParams.get("type") ?? "").trim() as ComplianceReportType;
  const format = (req.nextUrl.searchParams.get("format") ?? "json").trim() as "json" | "csv" | "xlsx" | "pdf";

  if (!type) {
    return NextResponse.json({
      ok: true,
      reports: COMPLIANCE_REPORT_TYPES,
    });
  }

  const valid = COMPLIANCE_REPORT_TYPES.some((r) => r.key === type);
  if (!valid) {
    return NextResponse.json({ ok: false, message: "Invalid report type." }, { status: 400 });
  }

  const report = await buildComplianceReport(gate.actor.organizationId, type);

  if (format === "json") {
    return NextResponse.json({ ok: true, report });
  }

  const exported = reportExportContent(report, format === "pdf" ? "pdf" : format);
  return new NextResponse(exported.body, {
    headers: {
      "Content-Type": exported.contentType,
      "Content-Disposition": `attachment; filename="${type}-report.${exported.extension}"`,
    },
  });
}
