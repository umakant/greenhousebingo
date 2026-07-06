import "server-only";

import type { ComplianceReportType } from "@/lib/compliance/compliance-day4";
import { computeComplianceScores } from "@/lib/compliance/compliance-scoring";
import {
  serializeAudit,
  serializeControl,
  serializeEvidence,
  serializeFramework,
  serializeRisk,
  serializeVendorReview,
  serializeVulnerability,
  loadOwner,
} from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export type ReportPayload = {
  type: ComplianceReportType;
  generatedAt: string;
  organizationId: number;
  title: string;
  summary: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
};

export async function buildComplianceReport(
  organizationId: bigint,
  type: ComplianceReportType,
): Promise<ReportPayload> {
  const generatedAt = new Date().toISOString();
  const orgId = Number(organizationId);

  if (type === "compliance") {
    const scores = await computeComplianceScores(organizationId);
    return {
      type,
      generatedAt,
      organizationId: orgId,
      title: "Compliance Report",
      summary: { scores },
      rows: [{ metric: "Overall Score", value: scores.overall }],
    };
  }

  if (type === "framework_readiness") {
    const frameworks = await prisma.complianceFramework.findMany({
      where: { organizationId },
      orderBy: { code: "asc" },
    });
    return {
      type,
      generatedAt,
      organizationId: orgId,
      title: "Framework Readiness Report",
      summary: { count: frameworks.length },
      rows: frameworks.map((f) => serializeFramework(f)),
    };
  }

  if (type === "evidence") {
    const rows = await prisma.complianceEvidence.findMany({
      where: { organizationId },
      include: { control: { select: { controlCode: true, title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    return {
      type,
      generatedAt,
      organizationId: orgId,
      title: "Evidence Report",
      summary: { count: rows.length },
      rows: rows.map((r) =>
        serializeEvidence({
          ...r,
          control: r.control
            ? {
                id: r.controlId ?? BigInt(0),
                controlCode: r.control.controlCode,
                title: r.control.title,
              }
            : null,
        }),
      ),
    };
  }

  if (type === "risk_register") {
    const rows = await prisma.complianceRisk.findMany({
      where: { organizationId },
      orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
      take: 500,
    });
    const items = await Promise.all(
      rows.map(async (row) => {
        const owner = await loadOwner(row.ownerUserId);
        return serializeRisk({ ...row, owner });
      }),
    );
    return {
      type,
      generatedAt,
      organizationId: orgId,
      title: "Risk Register",
      summary: { count: items.length },
      rows: items,
    };
  }

  if (type === "vendor") {
    const rows = await prisma.complianceVendorReview.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    return {
      type,
      generatedAt,
      organizationId: orgId,
      title: "Vendor Compliance Report",
      summary: { count: rows.length },
      rows: rows.map((r) => serializeVendorReview(r)),
    };
  }

  if (type === "audit_package") {
    const audits = await prisma.complianceAudit.findMany({
      where: { organizationId },
      include: { framework: { select: { id: true, code: true, name: true } } },
      orderBy: { startDate: "asc" },
    });
    const items = audits.map((row) => serializeAudit(row));
    return {
      type,
      generatedAt,
      organizationId: orgId,
      title: "Audit Package",
      summary: { count: items.length },
      rows: items,
    };
  }

  if (type === "vulnerability") {
    const rows = await prisma.complianceVulnerability.findMany({
      where: { organizationId },
      orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
      take: 500,
    });
    const items = rows.map((row) => serializeVulnerability(row));
    return {
      type,
      generatedAt,
      organizationId: orgId,
      title: "Vulnerability Report",
      summary: { count: items.length },
      rows: items,
    };
  }

  const controls = await prisma.complianceControl.findMany({
    where: { organizationId },
    include: { framework: { select: { id: true, code: true, name: true } } },
    take: 500,
  });
  return {
    type,
    generatedAt,
    organizationId: orgId,
    title: "Controls Report",
    summary: { count: controls.length },
    rows: controls.map((c) => serializeControl(c)),
  };
}

function escapeCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function reportToCsv(report: ReportPayload): string {
  if (report.rows.length === 0) return "No data\n";
  const keys = [...new Set(report.rows.flatMap((r) => Object.keys(r)))];
  const header = keys.map(escapeCsv).join(",");
  const lines = report.rows.map((row) => keys.map((k) => escapeCsv(row[k])).join(","));
  return [header, ...lines].join("\n");
}

export function reportToHtml(report: ReportPayload): string {
  const keys = report.rows.length
    ? [...new Set(report.rows.flatMap((r) => Object.keys(r)))]
    : ["metric", "value"];
  const head = keys.map((k) => `<th>${k}</th>`).join("");
  const body = report.rows
    .map((row) => `<tr>${keys.map((k) => `<td>${row[k] ?? ""}</td>`).join("")}</tr>`)
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${report.title}</title>
<style>body{font-family:system-ui,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}</style>
</head><body><h1>${report.title}</h1><p>Generated ${report.generatedAt}</p><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
}

export function reportExportContent(
  report: ReportPayload,
  format: "csv" | "xlsx" | "pdf",
): { body: string; contentType: string; extension: string } {
  if (format === "csv" || format === "xlsx") {
    const csv = reportToCsv(report);
    return {
      body: format === "xlsx" ? `\uFEFF${csv}` : csv,
      contentType:
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv;charset=utf-8",
      extension: format === "xlsx" ? "xlsx" : "csv",
    };
  }
  return {
    body: reportToHtml(report),
    contentType: "text/html;charset=utf-8",
    extension: "html",
  };
}
