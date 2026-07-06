import { PageHeader } from "@/components/greenhouse-bingo/page-header";

export function AboutPageContent() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title="Plants, drinks, and five rounds of bingo"
        subtitle="Greenhouse Bingo started as a weeknight brewery event. Today it's a national platform powering local reps who host plant bingo in their own cities."
      />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="prose prose-lg max-w-none">
          <p className="text-muted-foreground">
            The concept is simple: five rounds of bingo, five houseplant prizes per round. Every
            winner takes home a plant. Every attendee leaves with something — a plant, a new favorite
            spot, or the phone number of the person next to them who also has 14 monsteras at home.
          </p>
          <p className="mt-6 text-muted-foreground">
            We built Greenhouse Bingo so passionate hosts anywhere can launch their own local plant
            bingo brand. Reps get software, sourcing, branding, and playbooks. Venues get full rooms
            on quiet nights. Customers get a great night out. Everyone wins.
          </p>
        </div>
      </section>
    </>
  );
}
