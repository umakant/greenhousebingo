"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SiteHeader } from "@/components/waterice/site-header";

type Service = { title: string; desc: string; content?: ReactNode };
const services: Service[] = [
  {
    title: "Consulting",
    desc: "Expert guidance to launch and grow your water ice business.",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          Our team of experienced industry professionals is passionate about helping motivated entrepreneurs
          successfully enter, operate, and grow within the rapidly expanding water ice industry. At Water Ice
          Express, we provide the guidance, education, resources, and ongoing support needed to help individuals
          and businesses confidently turn their goals into reality.
        </p>
        <p>
          Through our virtual group training sessions, personalized one-on-one consulting programs, and hands-on
          business education, we equip entrepreneurs with the knowledge and strategies needed to build a strong
          foundation for long-term success. Whether you are starting your very first business, adding a new
          revenue stream, or expanding an existing operation, our team is committed to helping you navigate every
          stage of the journey.
        </p>
        <p>
          Water Ice Express also provides access to the products, equipment, supplies, branding guidance, and
          operational materials essential for launching and growing a professional water ice business. From
          understanding the fundamentals of the industry to learning real-world business strategies, we are
          dedicated to giving our clients the confidence, tools, and support system needed to succeed in their
          local communities.
        </p>
        <p>
          Our mission goes beyond simply selling products or equipment — we are focused on inspiring
          entrepreneurs, creating opportunities, and helping individuals build businesses that can positively
          impact their lives, their families, and the communities they serve.
        </p>
      </div>
    ),
  },
  {
    title: "Wholesale",
    desc: "Bulk water ice supply for retailers and food service partners.",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          Water Ice Express provides entrepreneurs and businesses with the guidance, education, products, and
          support needed to successfully enter and grow within the rapidly expanding water ice industry. Our team
          of experienced professionals is committed to helping motivated individuals confidently build and operate
          their own business through hands-on training, expert consulting, and real-world operational support.
        </p>
        <p>
          We offer virtual group training sessions, personalized one-on-one consulting programs, and ongoing
          educational resources designed to help entrepreneurs understand every aspect of launching and growing a
          successful water ice business. Whether you are starting your very first venture, adding an additional
          revenue stream, or expanding an existing operation, Water Ice Express is dedicated to helping you every
          step of the way.
        </p>
        <p>
          In addition to education and consulting, we provide access to the products, supplies, equipment, and
          materials needed to operate your business professionally and efficiently. Water Ice Express offers an
          extensive selection of 29 delicious water ice flavors, with pricing available based on flavor
          selection and quantity ordered. We also supply scoopers, spoons, napkins, cups available in four
          different sizes, and water ice equipment to ensure our clients have the essential tools needed for
          day-to-day operations.
        </p>
        <p>
          Our mission is about more than simply selling products — it is about inspiring entrepreneurs to build
          their own dreams within their local communities. Water Ice Express was created to empower motivated
          individuals with the knowledge, resources, and support system needed to create opportunities, generate
          income, and build a business that can positively impact their future for years to come.
        </p>
      </div>
    ),
  },
  {
    title: "Distribution",
    desc: "Reliable distribution network across the metro area and beyond.",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          Water Ice Express has built a growing distribution network designed to efficiently serve businesses,
          events, and entrepreneurs across multiple states. Our commitment to quality and consistency allows us to
          deliver premium water ice products while maintaining the freshness, texture, and flavor our customers
          expect.
        </p>
        <p>
          Through a combination of refrigerated transportation, strategic logistics, and trusted local
          partnerships, we ensure that our products are delivered safely and promptly to each destination. Our
          distribution process is carefully structured to preserve product quality throughout transit, allowing
          businesses to confidently serve customers with a consistently high-quality experience.
        </p>
        <p>
          As Water Ice Express continues to expand, our mission is to create opportunities for entrepreneurs and
          communities nationwide by making our products, resources, and business solutions more accessible than
          ever before. We are dedicated to extending our reach and building a reliable distribution system that
          supports vendors, events, and businesses looking to offer premium water ice products within their local
          markets.
        </p>
        <p>
          By combining operational support, dependable delivery systems, and industry expertise, Water Ice Express
          continues to position itself as a trusted partner for entrepreneurs seeking to build and grow successful
          water ice businesses across the country.
        </p>
      </div>
    ),
  },
];

export function ServicesClient() {
  const [active, setActive] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      const match = services.find((s) => s.title.toLowerCase() === hash);
      if (match) {
        setActive(match.title);
        requestAnimationFrame(() => {
          detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const handleSelect = (title: string) => {
    const next = active === title ? null : title;
    setActive(next);
    if (next) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="services" />
      <main className="mx-auto max-w-7xl px-6 py-16">
        <h1 className="font-display text-5xl font-extrabold text-foreground">Services</h1>
        <p className="mt-3 text-muted-foreground max-w-prose">Pick the experience that fits your day.</p>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {services.map((s) => {
            const isActive = active === s.title;
            return (
              <button
                key={s.title}
                type="button"
                onClick={() => handleSelect(s.title)}
                className={`text-left rounded-2xl border bg-card p-6 transition hover:shadow-lg ${
                  isActive ? "border-primary shadow-lg" : "border-border"
                }`}
              >
                <h2 className="font-display text-xl font-bold text-foreground">{s.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </button>
            );
          })}
        </div>

        {active && services.find((s) => s.title === active)?.content && (
          <section
            ref={detailRef}
            id={active.toLowerCase()}
            className="mt-10 rounded-2xl border border-border bg-card p-8 scroll-mt-24"
          >
            <h2 className="font-display text-3xl font-bold text-foreground">{active}</h2>
            <div className="mt-4">{services.find((s) => s.title === active)?.content}</div>
          </section>
        )}
      </main>
    </div>
  );
}
