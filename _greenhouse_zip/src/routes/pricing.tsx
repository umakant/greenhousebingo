import { createFileRoute } from "@tanstack/react-router";
import { StartBusinessContent } from "@/components/site/StartBusinessContent";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Start a Bingo Business — Greenhouse Bingo" },
      {
        name: "description",
        content:
          "Launch your own branded Plant Bingo business. Unlimited events, tickets, and payouts — starting at $97/month.",
      },
      { property: "og:title", content: "Start a Bingo Business — Greenhouse Bingo" },
      {
        property: "og:description",
        content:
          "Launch a branded Plant Bingo business in your city. Everything included, starting at $97/month.",
      },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return <StartBusinessContent />;
}
