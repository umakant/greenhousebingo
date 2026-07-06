import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "./events.index";
export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About · Greenhouse Bingo" }] }),
  component: () => <StubPage kicker="About" title="A community, growing.">We're on a mission to bring people together inside beautiful greenhouses — one bingo night, one plant, one new friend at a time.</StubPage>,
});
