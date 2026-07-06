import { renderMarketingComparePageFromParam } from "@/lib/render-marketing-compare-page";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ComparePage({ params }: PageProps) {
  const { slug } = await params;
  return renderMarketingComparePageFromParam(slug);
}
