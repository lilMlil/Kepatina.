import { useCallback, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** One card per screen: swipe or use the arrows; the last card wraps back to the first. */
export function Carousel({
  items,
  prevLabel,
  nextLabel,
}: {
  items: ReactNode[];
  prevLabel: string;
  nextLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = items.length;

  const go = useCallback(
    (i: number) => {
      const el = ref.current;
      if (!el || count === 0) return;
      const n = (i + count) % count;
      el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
    },
    [count],
  );

  const onScroll = () => {
    const el = ref.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  };

  const arrowCls =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary active:scale-95";

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div key={i} className="w-full shrink-0 snap-center snap-always">
            {item}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-label={prevLabel} onClick={() => go(index - 1)} className={arrowCls}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {items.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-5 bg-primary" : "w-2 bg-border",
              )}
            />
          ))}
        </div>
        <button type="button" aria-label={nextLabel} onClick={() => go(index + 1)} className={arrowCls}>
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
