import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, notFound, serverError } from "@/lib/hrm-auth";
import { getSettingsForOwner } from "@/lib/settings-service";
import { sendTemplatedEmail } from "@/lib/send-templated-email";

/**
 * Sends the "Offer Letter" DB email template to the candidate (parity with Laravel OfferController::sendEmail).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(_req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(_req);
  if (!checkPerm(perms, "manage-recruitment", "manage-offers", "send-offer-emails")) return forbidden();

  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const offer = await prisma.recOffer.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      include: {
        candidate: { select: { firstName: true, lastName: true, email: true } },
        job: { select: { title: true } },
      },
    });
    if (!offer) return notFound();

    const email = offer.candidate?.email?.trim();
    if (!email) {
      return jsonR({ ok: false, message: "Candidate email not found" }, { status: 400 });
    }

    const settings = await getSettingsForOwner(cid);
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const downloadUrl = baseUrl ? `${baseUrl}/recruitment/offers/${id}` : "-";
    const salaryVal =
      offer.salary != null
        ? `$${Number(offer.salary).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
        : "To be discussed";
    const candName =
      [offer.candidate?.firstName, offer.candidate?.lastName].filter(Boolean).join(" ").trim() || "-";

    const result = await sendTemplatedEmail({
      templateName: "Offer Letter",
      mailTo: [email],
      ownerId: cid,
      variables: {
        candidate_name: candName,
        candidate_email: email,
        job_title: offer.job?.title ?? offer.position,
        position: offer.position,
        salary: salaryVal,
        start_date: offer.startDate.toISOString().slice(0, 10),
        company_name: settings.company_name ?? "-",
        download_url: downloadUrl,
      },
    });

    if (!result.is_success) {
      return jsonR(
        { ok: false, message: typeof result.error === "string" ? result.error : "Failed to send email" },
        { status: 400 },
      );
    }
    return jsonR({ ok: true });
  } catch (e) {
    return serverError(e instanceof Error ? e.message : undefined);
  }
}
