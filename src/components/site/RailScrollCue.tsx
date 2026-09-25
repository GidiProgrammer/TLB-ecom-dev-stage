import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

const TRACK = 112;
const THUMB = 36;

function maxScroll(el: HTMLElement) {
  return Math.max(0, el.scrollWidth - el.clientWidth);
}

function scrollRail(el: HTMLElement, left: number, smooth: boolean) {
  const next = Math.min(maxScroll(el), Math.max(0, left));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollTo({ left: next, behavior: smooth && !reduced ? "smooth" : "auto" });
}

export function RailScrollCue({ target }: { target: RefObject<HTMLElement | null> }) {
  const railId = `rail-${useId().replace(/:/g, "")}`;
  const [offset, setOffset] = useState(0);
  const [overflow, setOverflow] = useState(false);
  const [valueNow, setValueNow] = useState(0);
  const dragged = useRef(false);
  const pointerStart = useRef(0);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    el.id = railId;

    const sync = () => {
      const max = maxScroll(el);
      const canScroll = max > 2;
      setOverflow(canScroll);
      setOffset(canScroll ? (el.scrollLeft / max) * (TRACK - THUMB) : 0);
      setValueNow(canScroll ? Math.round((el.scrollLeft / max) * 100) : 0);
    };

    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const resize = new ResizeObserver(sync);
    resize.observe(el);
    for (const child of el.children) resize.observe(child);
    const mutations = new MutationObserver(() => {
      for (const child of el.children) resize.observe(child);
      sync();
    });
    mutations.observe(el, { childList: true });

    return () => {
      el.removeEventListener("scroll", sync);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [target, railId]);

  if (!overflow) return null;

  const leftForClientX = (clientX: number, track: HTMLElement) => {
    const el = target.current;
    if (!el) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left - THUMB / 2) / (rect.width - THUMB)));
    return ratio * maxScroll(el);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragged.current = false;
    pointerStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = target.current;
    if (!el || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (Math.abs(event.clientX - pointerStart.current) < 4) return;
    dragged.current = true;
    el.scrollLeft = leftForClientX(event.clientX, event.currentTarget);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = target.current;
    if (!el || dragged.current) return;
    scrollRail(el, leftForClientX(event.clientX, event.currentTarget), true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const el = target.current;
    if (!el) return;
    const step = Math.max(48, el.clientWidth * 0.35);
    if (event.key === "ArrowRight") {
      scrollRail(el, el.scrollLeft + step, true);
      event.preventDefault();
    } else if (event.key === "ArrowLeft") {
      scrollRail(el, el.scrollLeft - step, true);
      event.preventDefault();
    } else if (event.key === "Home") {
      scrollRail(el, 0, true);
      event.preventDefault();
    } else if (event.key === "End") {
      scrollRail(el, maxScroll(el), true);
      event.preventDefault();
    }
  };

  return (
    <div className="mt-2 flex justify-center">
      <div
        role="scrollbar"
        aria-controls={railId}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valueNow}
        aria-label="Scroll this row"
        tabIndex={0}
        className="flex h-11 cursor-pointer items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        style={{ width: TRACK }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className="relative h-1.5 w-full rounded-full bg-gold/35">
          <div className="absolute top-0 h-full rounded-full bg-gold" style={{ width: THUMB, transform: `translateX(${offset}px)` }} />
        </div>
      </div>
    </div>
  );
}
