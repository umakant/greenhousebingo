import { StorefrontAccountResetClient } from "@/components/storefront/storefront-account-reset-client";

export default async function StorefrontAccountResetPage({
  params,
  searchParams,
}: {
  params: Promise<{ websiteId: string }>;
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { websiteId } = await params;
  const sp = await searchParams;
  return (
    <StorefrontAccountResetClient websiteId={websiteId} token={sp.token ?? ""} email={sp.email ?? ""} />
  );
}
