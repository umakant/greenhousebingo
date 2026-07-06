import type { Metadata } from "next";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { ContactPageContent } from "@/components/greenhouse-bingo/contact-page";

export const metadata: Metadata = {
  title: "Contact — Greenhouse Bingo",
  description:
    "Get in touch with Greenhouse Bingo about becoming a rep, hosting an event, or general support.",
};

export default function ContactPage() {
  return (
    <GhBingoShell>
      <ContactPageContent />
    </GhBingoShell>
  );
}
