import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonR, serverError } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

/**
 * Public list of published job postings for a company (no auth).
 * `company` is the tenant company user id (same as recruitment `createdBy`).
 */
export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("company")?.trim() ?? "";
    if (!/^\d+$/.test(raw)) {
      return jsonR({ error: "Invalid or missing company parameter" }, { status: 400 });
    }
    const cid = BigInt(raw);

    const companyRow = await prisma.user.findFirst({
      where: { id: cid, type: "company" },
      select: { id: true, name: true },
    });
    if (!companyRow) {
      return jsonR({ error: "Company not found" }, { status: 404 });
    }

    const jobs = await prisma.recJobPosting.findMany({
      where: { createdBy: cid, isPublished: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        title: true,
        postingCode: true,
        description: true,
        applicationDeadline: true,
        jobType: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    return jsonR({
      companyName: companyRow.name ?? null,
      jobs: jobs.map((j) => ({
        id: j.id.toString(),
        title: j.title,
        posting_code: j.postingCode,
        description: j.description,
        application_deadline: j.applicationDeadline,
        job_type: j.jobType?.name ?? null,
        location: j.location?.name ?? null,
      })),
    });
  } catch (e: unknown) {
    console.error("[public/careers/jobs]", e);
    return serverError();
  }
}
