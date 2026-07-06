import type { Metadata } from "next";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { GhPrivacyContent } from "@/components/greenhouse-bingo/gh-privacy-content";

export const metadata: Metadata = {
  title: "Privacy Policy — Greenhouse Bingo",
  description:
    "How Greenhouse Bingo collects, uses, discloses, retains, and safeguards Personal Information across its Platform and Services.",
};

export default function PrivacyPage() {
  return (
    <GhBingoShell>
      <GhPrivacyContent />
    </GhBingoShell>
  );
}
