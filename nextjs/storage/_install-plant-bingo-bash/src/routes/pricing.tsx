import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "./events.index";
export const Route = createFileRoute("/pricing")({
  head: () => ({ meta: [{ title: "Pricing · Greenhouse Bingo" }] }),
  component: () => <StubPage kicker="Pricing" title="One price. Every game. A plant.">Standard admission is $30 and includes 10 Bingo cards, event entry, a guaranteed take-home plant, and door prize entry.</StubPage>,
});
