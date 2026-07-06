import { createFileRoute } from "@tanstack/react-router";
import { StubPage } from "./events.index";
export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact · Greenhouse Bingo" }] }),
  component: () => <StubPage kicker="Contact" title="Say hi.">Questions about tickets, hosting an event at your venue, or partnerships? Reach out at hello@greenhousebingo.com.</StubPage>,
});
