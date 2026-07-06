import { notFound } from "next/navigation";

import { getPublicBrandSettingsForWebsiteId } from "@/lib/storefront/public-brand-for-website";

/** Validates website id; page routes render inside Liquid theme chrome (same as `/shop`). */
export default async function StorefrontAccountWebsiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ websiteId: string }>;
}) {
  const { websiteId } = await params;
  if (!/^\d+$/.test(websiteId)) notFound();

  const publicSettings = await getPublicBrandSettingsForWebsiteId(websiteId);
  if (!publicSettings) notFound();

  return children;
}
