import TrustCenterPage from "./trust-center-public";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TrustCenterPage slug={slug} />;
}
