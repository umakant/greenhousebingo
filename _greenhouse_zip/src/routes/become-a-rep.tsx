import { createFileRoute } from "@tanstack/react-router";
import { StartBusinessContent } from "@/components/site/StartBusinessContent";

export const Route = createFileRoute("/become-a-rep")({
  head: () => ({
    meta: [
      { title: "Start Your Own Plant Bingo Business — Greenhouse Bingo" },
      {
        name: "description",
        content:
          "Launch your own branded Plant Bingo website, sell tickets online, collect payments instantly, and manage every aspect of your business from one powerful dashboard.",
      },
      {
        property: "og:title",
        content: "Start Your Own Plant Bingo Business — Greenhouse Bingo",
      },
      {
        property: "og:description",
        content:
          "Launch a branded Plant Bingo business in your city. Everything included, starting at $97/month.",
      },
    ],
  }),
  component: BecomeRep,
});

function BecomeRep() {
  return <StartBusinessContent />;
}
