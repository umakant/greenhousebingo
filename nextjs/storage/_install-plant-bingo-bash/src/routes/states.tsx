import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "./events.index";
export const Route = createFileRoute("/states")({
  head: () => ({ meta: [{ title: "States · Greenhouse Bingo" }] }),
  component: () => <StubPage kicker="States" title="Growing coast to coast." />,
});
