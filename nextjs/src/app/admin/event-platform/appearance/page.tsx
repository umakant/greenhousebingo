import { redirect } from "next/navigation";

/** Appearance branding is managed in company Settings → Brand. */
export default function EventPlatformAppearanceRedirectPage() {
  redirect("/settings?tab=brand");
}
