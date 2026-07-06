import { StorefrontAccountForgotClient } from "@/components/storefront/storefront-account-forgot-client";

export default async function StorefrontAccountForgotPage({
  params,
}: {
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  return <StorefrontAccountForgotClient websiteId={websiteId} />;
}
