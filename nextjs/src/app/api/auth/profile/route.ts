import { NextResponse, type NextRequest } from "next/server";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/authz";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { normalizeMobileForStorage } from "@/lib/phone";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function fileNameHint(blob: Blob): string {
  if (blob instanceof File && blob.name?.trim()) return blob.name;
  return "avatar.png";
}

async function saveAvatarFile(blob: Blob): Promise<string> {
  const bytes = await blob.arrayBuffer();
  const buf = Buffer.from(bytes);
  const ext = path.extname(fileNameHint(blob)).toLowerCase() || ".png";
  const safeExt = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext) ? ext : ".png";
  const base = `avatar-${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;
  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });
  const full = path.join(dir, base);
  await writeFile(full, buf);
  return `uploads/avatars/${base}`;
}

function isNonEmptyUpload(value: FormDataEntryValue | null): value is File {
  if (value == null) return false;
  if (typeof value === "string") return false;
  return value.size > 0;
}

export async function PATCH(req: NextRequest) {
  const sessionEmail = normalizeEmail(req.cookies.get("pf_email")?.value ?? "");
  if (!sessionEmail) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const perms = await getPermissionsFromRequest(req);
  const canEdit =
    hasPermission(perms, "edit-profile") ||
    hasPermission(perms, "manage-profile");
  if (!canEdit) {
    return NextResponse.json({ ok: false, message: "Permission denied" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid form data" }, { status: 400 });
  }

  const name = String(form.get("name") ?? "").trim();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const mobileNo = normalizeMobileForStorage(String(form.get("mobile_no") ?? ""));
  const slugRaw = String(form.get("slug") ?? "").trim();
  const slug = slugRaw || null;
  const avatarFile = form.get("avatar");

  if (!name) {
    return NextResponse.json({ ok: false, message: "Name is required" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ ok: false, message: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email: sessionEmail },
    select: {
      id: true,
      email: true,
      type: true,
      createdBy: true,
      avatar: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
  }

  const duplicate = await prisma.user.findFirst({
    where: { email, id: { not: user.id } },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ ok: false, message: "This email is already taken." }, { status: 422 });
  }

  const isCompany = (user.type ?? "").toLowerCase() === "company";
  if (isCompany && slug) {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { ok: false, message: "Slug may only contain lowercase letters, numbers, and hyphens." },
        { status: 422 },
      );
    }
    const slugTaken = await prisma.user.findFirst({
      where: { slug, id: { not: user.id } },
      select: { id: true },
    });
    if (slugTaken) {
      return NextResponse.json({ ok: false, message: "This slug is already in use." }, { status: 422 });
    }
  }

  let newAvatarPath: string | undefined;
  if (isNonEmptyUpload(avatarFile)) {
    if (avatarFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: "Avatar must be 5 MB or smaller." }, { status: 400 });
    }
    const stored = await saveAvatarFile(avatarFile);
    newAvatarPath = stored;
    const old = user.avatar?.trim();
    if (old && !old.includes("avatar.png")) {
      try {
        const rel = old.replace(/^\//, "");
        await unlink(path.join(process.cwd(), "public", rel)).catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }

  const emailChanged = normalizeEmail(user.email ?? "") !== email;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      email,
      mobileNo,
      ...(isCompany ? { slug: slug ?? null } : {}),
      ...(newAvatarPath ? { avatar: newAvatarPath } : {}),
      ...(emailChanged ? { emailVerifiedAt: null } : {}),
      updatedAt: new Date(),
    },
  });

  const res = NextResponse.json({
    ok: true,
    message: "Profile updated successfully",
    user: {
      name,
      email,
      mobileNo: mobileNo ?? "",
      avatar: newAvatarPath ?? user.avatar ?? "",
      slug: isCompany ? slug ?? "" : "",
    },
  });

  res.cookies.set("pf_name", name, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  if (emailChanged) {
    res.cookies.set("pf_email", email, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}
