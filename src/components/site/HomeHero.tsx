import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import heroLab from "@/assets/hero-lab.jpg";
import imgEquipment from "@/assets/cat-laboratory-equipment.jpg";
import imgAnalytical from "@/assets/cat-analytical-chemicals.jpg";
import { Button } from "@/components/ui/button";

const slides = [
  {
    id: "supplies",
    image: imgEquipment,
    imageAlt: "Laboratory equipment on a bench",
    kicker: "Analytical chemicals · Equipment · Consumables",
    title: "Laboratory supplies for serious work.",
    body: "TLB Enterprise supplies universities, hospitals, industry and research institutions across Ghana.",
    cta: "Browse the catalogue",
    to: "/shop" as const,
  },
  {
    id: "lifestyle",
    image: heroLab,
    imageAlt: "Scientist working at a laboratory bench with analytical instruments",
    imageClass: "scale-x-[-1] object-[center_20%] md:object-[32%_center]",
    kicker: "Institutions across Ghana",
    title: "Built for teaching, clinical and research labs.",
    body: "Browse listed catalogue pricing, then we confirm availability, delivery and invoicing with you.",
    cta: "Shop all products",
    to: "/shop" as const,
  },
  {
    id: "quote",
    image: imgAnalytical,
    imageAlt: "Analytical chemicals and reagents",
    kicker: "Tenders, purchase orders and bulk supply",
    title: "Need a quotation instead of a catalogue order?",
    body: "Build a quote list from the catalogue. Quoted prices are estimates, not an invoice.",
    cta: "Request a quote",
    to: "/quote" as const,
  },
];

export function HomeHero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[index] ?? slides[0];
  if (!slide) return null;

  const go = (next: number) => {
    setIndex((next + slides.length) % slides.length);
  };

  const cta =
    slide.to === "/quote" ? (
      <Link to="/quote">
        {slide.cta} <ArrowRight className="h-4 w-4" />
      </Link>
    ) : (
      <Link to="/shop">
        {slide.cta} <ArrowRight className="h-4 w-4" />
      </Link>
    );

  return (
    <section aria-labelledby="home-hero-heading" className="bg-muted pb-4 pt-4 md:pb-6 md:pt-5">
      <div className="container-page">
        <div className="relative isolate overflow-hidden rounded-lg bg-primary text-white">
          <div className="grid min-h-[22rem] md:grid-cols-2 lg:min-h-[28rem]">
            <div className="relative z-10 flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-12">
              <p className="text-sm font-medium text-gold">{slide.kicker}</p>
              <h1
                id="home-hero-heading"
                className="mt-2 max-w-[18ch] text-[1.75rem] font-semibold leading-[1.15] tracking-tight sm:text-[2.25rem] md:text-[2.75rem]"
              >
                {slide.title}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/95 sm:text-base">{slide.body}</p>
              <Button asChild size="lg" className="mt-8 w-fit bg-gold text-gold-foreground hover:bg-gold/90">
                {cta}
              </Button>
            </div>
            <div className="relative min-h-[14rem] bg-primary-soft md:min-h-full">
              <img
                src={slide.image}
                alt={slide.imageAlt}
                className={`absolute inset-0 h-full w-full object-cover ${slide.imageClass ?? "object-center"}`}
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-0 hidden items-center p-2 lg:flex">
            <button
              type="button"
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Previous slide"
              onClick={() => go(index - 1)}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden items-center p-2 lg:flex">
            <button
              type="button"
              className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Next slide"
              onClick={() => go(index + 1)}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1 lg:bottom-4">
            <div className="flex gap-1 rounded-full bg-primary/40 p-1 lg:hidden">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Previous slide"
                onClick={() => go(index - 1)}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Next slide"
                onClick={() => go(index + 1)}
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
          <div
            className="absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 gap-1 lg:flex"
            role="tablist"
            aria-label="Hero slides"
          >
            {slides.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show slide ${i + 1}`}
                className="inline-flex h-11 min-w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setIndex(i)}
              >
                <span
                  className={`block h-2 rounded-full ${i === index ? "w-8 bg-gold" : "w-5 bg-white/55"}`}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
