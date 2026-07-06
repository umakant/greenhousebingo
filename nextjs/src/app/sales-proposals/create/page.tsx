import { redirect } from "next/navigation";

export default function SalesProposalCreatePage() {
  redirect("/sales-proposals?create=1");
}
