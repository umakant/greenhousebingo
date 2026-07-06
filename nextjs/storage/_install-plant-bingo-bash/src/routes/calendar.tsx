import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "./events.index";
export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar · Greenhouse Bingo" }] }),
  component: () => <StubPage kicker="Calendar" title="Every event, all in one place." />,
});
