import { Trees, SprayCan, Wrench, PaintRoller, TreePine, Snowflake, type LucideIcon } from "lucide-react";
const landscaping = "/assets/industry-landscaping.jpg";
const windowImg = "/assets/industry-window.jpg";
const handyman = "/assets/industry-handyman.jpg";
const painting = "/assets/industry-painting.jpg";
const tree = "/assets/industry-tree.jpg";
const snow = "/assets/industry-snow.jpg";

type Industry = { label: string; image: string; icon: LucideIcon };

const industries: Industry[] = [
  { label: "Landscaping", image: landscaping, icon: Trees },
  { label: "Window Cleaning", image: windowImg, icon: SprayCan },
  { label: "Handyman", image: handyman, icon: Wrench },
  { label: "Painting", image: painting, icon: PaintRoller },
  { label: "Tree Care", image: tree, icon: TreePine },
  { label: "Snow Removal", image: snow, icon: Snowflake },
];

export function IndustriesSection() {
  return (
    <section className="bg-[oklch(0.96_0.03_240)] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Serving 50+ <span className="text-brand">Industries</span>
        </h2>

        <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
          {industries.map((i) => {
            const Icon = i.icon;
            return (
              <div
                key={i.label}
                className="relative overflow-hidden rounded-2xl bg-card shadow-md transition-transform hover:-translate-y-1"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={i.image}
                    alt={i.label}
                    width={640}
                    height={640}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="relative px-3 pb-5 pt-8 text-center">
                  <div className="absolute -top-7 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground sm:text-base">{i.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex justify-center">
          <button className="rounded-full bg-brand px-8 py-3.5 text-sm font-bold text-brand-foreground shadow-lg transition-colors hover:bg-brand/90">
            See All Industries
          </button>
        </div>
      </div>
    </section>
  );
}
