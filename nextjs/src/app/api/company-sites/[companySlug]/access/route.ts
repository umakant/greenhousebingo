import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  companySiteAccessCookieName,
  createCompanySiteAccessToken,
  verifyCompanyWebsiteAccessPassword,
} from "@/lib/company-themes/company-website-password";
import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";
import {
  resolveCompanySiteBasePath,
} from "@/lib/company-themes/company-website-custom-domain";
import { buildRedirectUrl } from "@/lib/public-url";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  password: z.string().min(1).max(200),
  next: z.string().optional(),
});

type Ctx = { params: Promise<{ companySlug: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { companySlug } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return NextResponse.json({ ok: false, message: "Company site not found." }, { status: 404 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? "Password is required." },
      { status: 400 },
    );
  }

  const ok = await verifyCompanyWebsiteAccessPassword(ownerId, parsed.data.password);
  if (!ok) {
    return NextResponse.json({ ok: false, message: "Incorrect password." }, { status: 401 });
  }

  const token = await createCompanySiteAccessToken(companySlug, ownerId);
  const hostHeader = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const siteBase = await resolveCompanySiteBasePath(ownerId, companySlug, hostHeader);
  const slugPrefix = `/sites/${encodeURIComponent(companySlug)}`;
  let redirectTo = siteBase || "/";
  const nextPath = (parsed.data.next ?? "").trim();
  if (nextPath) {
    if (siteBase && nextPath.startsWith(siteBase)) {
      redirectTo = nextPath;
    } else if (!siteBase) {
      if (nextPath.startsWith(slugPrefix)) {
        redirectTo = nextPath.slice(slugPrefix.length) || "/";
      } else if (nextPath.startsWith("/")) {
        redirectTo = nextPath;
      }
    } else if (nextPath.startsWith(slugPrefix)) {
      redirectTo = nextPath;
    }
  }

  const res = NextResponse.json({ ok: true, redirectTo });
  res.cookies.set(companySiteAccessCookieName(companySlug), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
