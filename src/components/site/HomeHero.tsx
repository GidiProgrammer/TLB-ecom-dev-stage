import { useEffect, useRef, useState } from "react";
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
    imageClass: "object-contain object-center p-2 sm:p-3",
    kicker: "Analytical chemicals · Equipment · Consumables",
    title: "Laboratory supplies for serious work.",
    body: "TLB Enterprise supplies universities, hospitals, industry and research institutions across Ghana.",
    cta: "Browse the catalogue",
    to: "/shop" as const,
    secondary: "Request a quote",
    secondaryTo: "/quote" as const,
  },
  {
    id: "lifestyle",
    image: heroLab,
    imageAlt: "Scientist working at a laboratory bench with analytical instruments",
    imageClass: "object-cover object-[22%_center]",
    kicker: "Institutions across Ghana",
    title: "Built for teaching, clinical and research labs.",
    body: "Browse listed catalogue pricing, then we confirm availability, delivery and invoicing with you.",
    cta: "Shop all products",
    to: "/shop" as const,
    secondary: "Request a quote",
    secondaryTo: "/quote" as const,
  },
  {
    id: "quote",
    image: imgAnalytical,
    imageAlt: "Analytical chemicals and reagents",
    imageClass: "object-contain object-center p-2 sm:p-3",
    kicker: "Tenders, purchase orders and bulk supply",
    title: "Need a quotation instead of a catalogue order?",
    body: "Build a quote list from the catalogue. Quoted prices are estimates, not an invoice.",
    cta: "Request a quote",
    to: "/quote" as const,
    secondary: "Browse the catalogue",
    secondaryTo: "/shop" as const,
  },
];

type HeroSlide = (typeof slides)[number];

function slideAt(index: number): HeroSlide {
  const count = slides.length;
  return slides[((index % count) + count) % count] ?? slides[0]!;
}

export function HomeHero() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [shift, setShift] = useState<-1 | 0 | 1>(0);
  const [incoming, setIncoming] = useState<number | null>(null);
  const [motion, setMotion] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const shiftRef = useRef(0);
  const goRef = useRef<(next: number, dir: -1 | 1) => void>(() => {});
  const hovering = useRef(false);
  const focused = useRef(false);
  const pressing = useRef(false);
  const endPressRef = useRef<(() => void) | null>(null);

  const syncPause = () => {
    setPaused(hovering.current || focused.current || pressing.current);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sync = () => {
      setPaused(hovering.current || focused.current || pressing.current);
    };

    const onFocusIn = () => {
      focused.current = true;
      sync();
    };

    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && root.contains(next)) return;
      queueMicrotask(() => {
        if (!root.isConnected) return;
        focused.current = root.contains(document.activeElement);
        sync();
      });
    };

    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    focused.current = root.contains(document.activeElement);
    // A pointer already over the hero does not emit mouseenter after hydration.
    hovering.current = root.matches(":hover");
    sync();

    return () => {
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      const endPress = endPressRef.current;
      if (!endPress) return;
      window.removeEventListener("pointerup", endPress);
      window.removeEventListener("pointercancel", endPress);
      endPressRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (paused) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const timer = window.setInterval(() => {
      goRef.current(indexRef.current + 1, 1);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused]);

  const finishSlide = () => {
    if (shiftRef.current === 0) return;
    const next = (indexRef.current + shiftRef.current + slides.length) % slides.length;
    shiftRef.current = 0;
    indexRef.current = next;
    setMotion(false);
    setShift(0);
    setIncoming(null);
    setIndex(next);
  };

  const goTo = (nextRaw: number, dir: -1 | 1) => {
    const count = slides.length;
    const next = ((nextRaw % count) + count) % count;
    if (shiftRef.current !== 0 || next === indexRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      indexRef.current = next;
      setIndex(next);
      return;
    }
    shiftRef.current = dir;
    setIncoming(next);
    setMotion(true);
    setShift(dir);
  };

  goRef.current = goTo;

  const leftIndex = shift === -1 && incoming != null ? incoming : index - 1;
  const rightIndex = shift === 1 && incoming != null ? incoming : index + 1;
  const panels = [slideAt(leftIndex), slideAt(index), slideAt(rightIndex)];

  return (
    <section aria-labelledby="home-hero-heading" className="bg-background pb-2 pt-4 md:pb-4 md:pt-5">
      <div className="container-page">
        <div
          ref={rootRef}
          className="relative isolate overflow-hidden rounded-lg bg-deep-purple text-white"
          data-autoplay={paused ? "paused" : "running"}
          onMouseEnter={() => {
            hovering.current = true;
            syncPause();
          }}
          onMouseLeave={() => {
            hovering.current = false;
            syncPause();
          }}
          onPointerDown={() => {
            pressing.current = true;
            syncPause();
            if (endPressRef.current) return;
            const endPress = () => {
              pressing.current = false;
              window.removeEventListener("pointerup", endPress);
              window.removeEventListener("pointercancel", endPress);
              endPressRef.current = null;
              syncPause();
            };
            endPressRef.current = endPress;
            window.addEventListener("pointerup", endPress);
            window.addEventListener("pointercancel", endPress);
          }}
        >
          <div className="overflow-hidden">
            <div
              ref={trackRef}
              className={`flex w-[300%] ${motion ? "transition-transform duration-500 ease-out motion-reduce:transition-none" : ""}`}
              style={{ transform: `translate3d(${((-1 - shift) / 3) * 100}%, 0, 0)` }}
              onTransitionEnd={(event) => {
                if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
                finishSlide();
              }}
            >
              {panels.map((panel, panelIndex) => (
                <HeroPanel
                  key={panelIndex === 0 ? "prev" : panelIndex === 1 ? "current" : "next"}
                  slide={panel}
                  current={panelIndex === 1}
                />
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-y-0 left-[42%] z-20 hidden -translate-x-1/2 items-center md:flex">
            <button
              type="button"
              className="pointer-events-auto inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-deep-purple shadow-sm hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-purple"
              aria-label="Previous slide"
              onClick={() => goTo(index - 1, -1)}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden items-center p-3 md:flex">
            <button
              type="button"
              className="pointer-events-auto inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-deep-purple shadow-sm hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              aria-label="Next slide"
              onClick={() => goTo(index + 1, 1)}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-1 md:inset-x-auto md:bottom-3 md:left-3 md:w-[42%] md:justify-start md:px-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-purple md:hidden"
              aria-label="Previous slide"
              onClick={() => goTo(index - 1, -1)}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <div role="tablist" aria-label="Hero slides" className="flex justify-center md:justify-start">
            {slides.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show slide ${i + 1}`}
                className="inline-flex h-11 min-w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-purple"
                onClick={() => {
                  if (i === index) return;
                  const forward = (i - index + slides.length) % slides.length;
                  goTo(i, forward <= slides.length / 2 ? 1 : -1);
                }}
              >
                <span
                  className={`block h-2 rounded-full ${i === index ? "w-8 bg-gold" : "w-5 bg-white/45"}`}
                  aria-hidden
                />
              </button>
            ))}
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-purple md:hidden"
              aria-label="Next slide"
              onClick={() => goTo(index + 1, 1)}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPanel({ slide, current }: { slide: HeroSlide; current: boolean }) {
  const titleClass =
    "mt-3 max-w-[16ch] text-[1.75rem] font-bold leading-[1.12] tracking-tight text-white sm:text-[2rem] lg:text-[2.45rem]";

  return (
    <div className="w-1/3 shrink-0" inert={current ? undefined : true} aria-hidden={current ? undefined : true}>
      <div className="flex flex-col md:relative md:block md:min-h-[24rem] lg:min-h-[27rem]">
        <div className="relative h-48 bg-neutral-50 sm:h-56 md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[58%]">
          <img
            src={slide.image}
            alt={current ? slide.imageAlt : ""}
            className={`absolute inset-0 h-full w-full ${slide.imageClass}`}
          />
        </div>
        <div className="flex flex-col justify-center bg-deep-purple px-5 pb-16 pt-6 text-white sm:px-8 md:min-h-[24rem] md:w-[42%] md:px-8 md:pb-16 md:pt-8 lg:min-h-[27rem] lg:px-10">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-gold">{slide.kicker}</p>
          {current ? (
            <h1 id="home-hero-heading" className={titleClass}>
              {slide.title}
            </h1>
          ) : (
            <p className={titleClass}>{slide.title}</p>
          )}
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/85 sm:text-base">{slide.body}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Button
              asChild
              size="lg"
              className="bg-gold text-gold-foreground hover:bg-gold-hover focus-visible:ring-gold focus-visible:ring-offset-deep-purple"
            >
              <Link to={slide.to}>
                {slide.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Link
              to={slide.secondaryTo}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline-offset-4 hover:text-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-deep-purple"
            >
              {slide.secondary}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
