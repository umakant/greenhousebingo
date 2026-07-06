import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/buy-tickets")({
  head: () => ({ meta: [{ title: "Buy Tickets · Greenhouse Bingo" }] }),
  component: BuyTicketsRedirect,
});

function BuyTicketsRedirect() {
  useEffect(() => {
    window.location.replace("/#events");
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-forest">Buy Tickets</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-forest-deep">Taking you to Find a Venue...</h1>
        <a href="/#events" className="mt-8 inline-flex rounded-full bg-forest px-6 py-3 font-bold text-cream hover:bg-forest-deep transition">
          Find a Venue
        </a>
      </div>
    </main>
  );
}
