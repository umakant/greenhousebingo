import { redirect } from "next/navigation";

/** Legacy Event Platform venues URL → Venue Management add-on dashboard. */
export default function EventPlatformVenuesRedirectPage() {
  redirect("/admin/venue-management");
}
