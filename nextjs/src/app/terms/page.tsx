import { renderMarketingInfoPage } from "@/lib/render-marketing-info-page";

export const dynamic = "force-dynamic";

export default function TermsPage() {
  return renderMarketingInfoPage("terms");
}
