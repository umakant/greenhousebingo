import { redirect } from "next/navigation";

/** System setup sections live under `/support-ticket/system-setup/[section]`. */
export default function SupportTicketSystemSetupIndexPage() {
  redirect("/support-ticket/system-setup/categories");
}
