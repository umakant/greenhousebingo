import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import {
  complianceFrameworkIconLocalDir,
  isAllowedComplianceFrameworkIconName,
} from "@/lib/compliance/compliance-framework-icon-upload";

export const dynamic = "force-dynamic";

function mimeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename: rawName } = await params;
  const fileName = decodeURIComponent(rawName ?? "").trim();
  if (!isAllowedComplianceFrameworkIconName(fileName)) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const absPath = path.join(complianceFrameworkIconLocalDir(), fileName);
  const baseDir = path.resolve(complianceFrameworkIconLocalDir());
  if (!path.resolve(absPath).startsWith(baseDir + path.sep) && path.resolve(absPath) !== baseDir) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  try {
    const buf = await readFile(absPath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": mimeForExt(path.extname(fileName)),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }
}
