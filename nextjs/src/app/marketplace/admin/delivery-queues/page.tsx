import { redirect } from "next/navigation";

/** Legacy route — delivery map lives under /admin/marketplace/delivery-map */
export default function MarketplaceDeliveryQueuesRedirectPage() {
  redirect("/admin/marketplace/delivery-map");
}

