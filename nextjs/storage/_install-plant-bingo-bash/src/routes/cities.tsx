import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "./events.index";
export const Route = createFileRoute("/cities")({
  head: () => ({ meta: [{ title: "Cities · Greenhouse Bingo" }] }),
  component: () => <StubPage kicker="Cities" title="Bingo nights, block by block." />,
});
