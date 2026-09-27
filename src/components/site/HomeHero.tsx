import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import heroBench from "@/assets/hero-bench.png";
import heroLab from "@/assets/hero-lab.jpg";
import heroChemicals from "@/assets/hero-slide-chemicals.png";
import { Button } from "@/components/ui/button";

const slides = [
  {
    id: "supplies",
    image: heroBench,
    imageAlt: "Beaker of purple liquid, a flask, and amber reagent bottles on a laboratory bench",
    imageClass: "inset-0 h-full w-full object-cover object-[28%_center]",
    kicker: "Tenders, purchase orders & bulk supply",
    titleLead: "Reliable laboratory supplies for",
    titleAccent: "research, education and industry.",
    body: "Request a quote, build a product list or browse our catalogue. Quoted prices are estimates, not an invoice.",
    cta: "Request a quote",
    to: "/quote" as const,
    secondary: "Browse catalogue",
    secondaryTo: "/shop" as const,
  },
  {
    id: "lifestyle",
    image: heroLab,
    imageAlt: "Scientist working at a laboratory bench with analytical instruments",
    imageClass: "inset-0 h-full w-full object-cover object-[70%_center]",
    kicker: "Institutions across Ghana",
    titleLead: "Built for",
    titleAccent: "teaching, clinical and research labs.",
    body: "Browse listed catalogue pricing, then we confirm availability, delivery and invoicing with you.",
    cta: "Shop all products",
    to: "/shop" as const,
    secondary: "Request a quote",
    secondaryTo: "/quote" as const,
  },
  {
    id: "quote",
    image: heroChemicals,
    imageAlt: "Analytical chemical bottles arranged on a laboratory bench",
    imageClass: "inset-0 h-full w-full object-cover object-center",
    kicker: "Tenders, purchase orders and bulk supply",
    titleLead: "Need a quotation instead of",
    titleAccent: "a catalogue order?",
    body: "Build a quote list from the catalogue. Quoted prices are estimates, not an invoice.",
    cta: "Request a quote",
    to: "/quote" as const,
    secondary: "Browse catalogue",
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
          className="relative isolate overflow-hidden rounded-2xl bg-[#f4f0fa]"
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

          <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex sm:hidden">
            <button
              type="button"
              className="pointer-events-auto inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white text-primary shadow-sm hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Previous slide"
              onClick={() => goTo(index - 1, -1)}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="pointer-events-none absolute bottom-3 right-3 z-20 sm:hidden">
            <button
              type="button"
              className="pointer-events-auto inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-deep-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Next slide"
              onClick={() => goTo(index + 1, 1)}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden items-center p-3 sm:flex">
            <button
              type="button"
              className="pointer-events-auto inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-deep-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Next slide"
              onClick={() => goTo(index + 1, 1)}
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center sm:bottom-4 sm:left-auto sm:right-16 sm:translate-x-0">
            <div role="tablist" aria-label="Hero slides" className="flex items-center">
            {slides.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show slide ${i + 1}`}
                className="inline-flex h-6 w-6 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => {
                  if (i === index) return;
                  const forward = (i - index + slides.length) % slides.length;
                  goTo(i, forward <= slides.length / 2 ? 1 : -1);
                }}
              >
                <span
                  className={`block h-1.5 w-1.5 rounded-full ${i === index ? "bg-primary" : "bg-neutral-400"}`}
                  aria-hidden
                />
              </button>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroPanel({ slide, current }: { slide: HeroSlide; current: boolean }) {
  const titleClass =
    "mt-4 max-w-[20rem] text-balance text-[2rem] font-extrabold leading-[1.05] tracking-tight text-neutral-950 sm:max-w-[32rem] sm:text-[2.65rem] lg:max-w-[40rem] lg:text-[3.05rem]";
  const title = (
    <>
      {slide.titleLead} <span className="text-primary">{slide.titleAccent}</span>
    </>
  );

  return (
    <div className="w-1/3 shrink-0" inert={current ? undefined : true} aria-hidden={current ? undefined : true}>
      <div className="relative min-h-[32rem] bg-[#f4f0fa] sm:min-h-[28rem] lg:min-h-[32rem]">
        <img
          src={slide.image}
          alt={current ? slide.imageAlt : ""}
          className={`absolute ${slide.imageClass}`}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#f3eef9_0%,rgba(243,238,249,0.94)_42%,rgba(243,238,249,0.55)_66%,rgba(243,238,249,0.12)_100%)] sm:bg-[linear-gradient(90deg,#f3eef9_0%,#f4f0fa_30%,rgba(244,240,250,0.9)_46%,rgba(244,240,250,0.4)_64%,transparent_80%)]"
          aria-hidden
        />
        <div className="relative flex min-h-[32rem] max-w-3xl flex-col justify-start px-5 pb-20 pt-8 sm:min-h-[28rem] sm:justify-center sm:px-10 sm:py-12 lg:min-h-[32rem] lg:px-14">
          <p className="max-w-md text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-primary">
            {slide.kicker}
          </p>
          {current ? (
            <h1 id="home-hero-heading" className={titleClass}>
              {title}
            </h1>
          ) : (
            <p className={titleClass}>{title}</p>
          )}
          <p className="mt-4 max-w-md text-sm leading-relaxed text-neutral-600 sm:text-[0.95rem]">{slide.body}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild className="h-11 min-h-11 rounded-full px-5">
              <Link to={slide.to}>
                {slide.cta} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 min-h-11 rounded-full border-primary bg-white px-5 text-primary hover:bg-primary-soft hover:text-primary"
            >
              <Link to={slide.secondaryTo}>{slide.secondary}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
