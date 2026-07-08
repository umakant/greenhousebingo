import { redirect } from "next/navigation";

/** Subscription plans are managed in superadmin at /plans. */
export default function EventPlatformSubscriptionsRedirectPage() {
  redirect("/plans");
}
