import { prisma } from "@/lib/prisma";

/** Stale `PrismaClient` (before `prisma generate`) or missing migration: delegate/table may be absent. */
async function safeStorefrontBlogPostCounts(organizationId: bigint): Promise<[number, number]> {
  const delegate = (prisma as unknown as { storefrontBlogPost?: { count: (args: { where: object }) => Promise<number> } })
    .storefrontBlogPost;
  if (!delegate || typeof delegate.count !== "function") return [0, 0];
  try {
    return await Promise.all([
      delegate.count({ where: { organizationId } }),
      delegate.count({ where: { organizationId, status: "published" } }),
    ]);
  } catch {
    return [0, 0];
  }
}

export type StorefrontDashboardPayload = {
  counts: {
    websites: number;
    domains: number;
    pages: number;
    pagesPublished: number;
    themes: number;
    blogPosts: number;
    blogPostsPublished: number;
  };
  monthlyActivity: { month: string; events: number }[];
  recentEvents: Array<{
    id: string;
    eventType: string;
    message: string | null;
    createdAt: string;
    websiteId: string | null;
  }>;
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastNMonthLabels(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(
      d.toLocaleString("en-US", { month: "short" }) + " " + d.getFullYear(),
    );
  }
  return out;
}

export async function getStorefrontDashboardStats(organizationId: bigint): Promise<StorefrontDashboardPayload> {
  const [websites, domains, pages, pagesPublished, themes] = await Promise.all([
    prisma.website.count({ where: { organizationId } }),
    prisma.domain.count({ where: { organizationId } }),
    prisma.page.count({ where: { organizationId } }),
    prisma.page.count({ where: { organizationId, status: "published" } }),
    prisma.theme.count({ where: { organizationId } }),
  ]);
  const [blogPosts, blogPostsPublished] = await safeStorefrontBlogPostCounts(organizationId);

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const logs = await prisma.eventLog.findMany({
    where: { organizationId, createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true },
  });

  const byMonth = new Map<string, number>();
  for (const row of logs) {
    const d = row.createdAt instanceof Date ? row.createdAt : new Date(String(row.createdAt));
    const k = monthKey(d);
    byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
  }

  const labels = lastNMonthLabels(6);
  const monthlyActivity = labels.map((label, idx) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - idx));
    const k = monthKey(d);
    return { month: label, events: byMonth.get(k) ?? 0 };
  });

  const recent = await prisma.eventLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      eventType: true,
      message: true,
      createdAt: true,
      websiteId: true,
    },
  });

  return {
    counts: { websites, domains, pages, pagesPublished, themes, blogPosts, blogPostsPublished },
    monthlyActivity,
    recentEvents: recent.map((r) => ({
      id: r.id.toString(),
      eventType: r.eventType,
      message: r.message,
      websiteId: r.websiteId != null ? r.websiteId.toString() : null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    })),
  };
}
