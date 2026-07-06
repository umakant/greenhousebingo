import type { Metadata } from "next";
import { GhBingoShell } from "@/components/greenhouse-bingo/gh-bingo-shell";
import { AuthPageContent } from "@/components/greenhouse-bingo/auth-page";

export const metadata: Metadata = {
  title: "Log in or sign up — Greenhouse Bingo",
  description: "Log in or create your Greenhouse Bingo account.",
  robots: { index: false },
};

export default function AuthPage() {
  return (
    <GhBingoShell>
      <AuthPageContent />
    </GhBingoShell>
  );
}
