import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-users") && !hasPermission(perms, "manage-media") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ ok: false, message: "Expected multipart/form-data with a file" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file") ?? form.get("logo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "No file provided. Use field 'file' or 'logo'." }, { status: 400 });
  }

  const folder = (form.get("folder") as string)?.trim() || "company-logos";
  try {
    const bytes = await file.arrayBuffer();
    const url = await uploadImageToCloudinary(Buffer.from(bytes), file.name || "upload.png", { folder });
    return NextResponse.json({ ok: true, url });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
