import { NextRequest, NextResponse } from "next/server";

import { findCompanyOwnerIdByPublicSlug } from "@/lib/company-themes/company-website-host-resolver";
import { isCompanyWebsiteAccessBlocked } from "@/lib/company-themes/company-website-password";
import { getWorkshopTicketsByOrderReference } from "@/lib/company-themes/company-site-workshop-service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ companySlug: string; reference: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { companySlug, reference } = await params;
  const ownerId = await findCompanyOwnerIdByPublicSlug(companySlug);
  if (!ownerId) {
    return NextResponse.json({ ok: false, message: "Company site not found." }, { status: 404 });
  }

  if (await isCompanyWebsiteAccessBlocked(ownerId, companySlug, req)) {
    return NextResponse.json({ ok: false, message: "Password required." }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get("email")?.trim();
  const tickets = await getWorkshopTicketsByOrderReference({
    ownerId,
    orderReference: reference,
    email: email || undefined,
  });

  if (tickets.length === 0) {
    return NextResponse.json({ ok: false, message: "Ticket not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, reference, tickets });
}
