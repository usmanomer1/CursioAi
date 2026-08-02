"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "cursio-split";

/** Read the persisted width once on the client without a setState-in-effect. */
const subscribeNoop = () => () => {};
function useStoredPct(fallback: number, min: number, max: number): number {
  const stored = useSyncExternalStore(
    subscribeNoop,
    () => localStorage.getItem(STORAGE_KEY),
    () => null
  );
  const n = Number(stored);
  return stored !== null && n >= min && n <= max ? n : fallback;
}

/**
 * Two-pane layout with a draggable divider (side-by-side on lg+, stacked
 * below). Width is applied via the --split custom property and only takes
 * effect at lg via the .split-pane rule in globals.css, so the mobile layout
 * stays full-width. The chosen width persists across navigations.
 */
export function ResizableSplit({
  left,
  right,
  min = 26,
  max = 68,
  defaultPct = 46,
  className,
  rightClassName,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  min?: number;
  max?: number;
  defaultPct?: number;
  className?: string;
  rightClassName?: string;
}) {
  const initial = useStoredPct(defaultPct, min, max);
  const [override, setOverride] = useState<number | null>(null);
  const pct = override ?? initial;
  const setPct = (next: number | ((p: number) => number)) =>
    setOverride((prev) =>
      typeof next === "function" ? next(prev ?? initial) : next
    );

  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMove = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const next = Math.min(
        max,
        Math.max(min, ((clientX - r.left) / r.width) * 100)
      );
      setPct(next);
    },
    [min, max]
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => onMove(e.clientX);
    const touch = (e: TouchEvent) => onMove(e.touches[0].clientX);
    const stop = () => setDragging(false);

    window.addEventListener("mousemove", move);
    window.addEventListener("touchmove", touch);
    window.addEventListener("mouseup", stop);
    window.addEventListener("touchend", stop);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", touch);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchend", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging, onMove]);

  // Persist once the drag settles.
  useEffect(() => {
    if (dragging) return;
    localStorage.setItem(STORAGE_KEY, String(Math.round(pct)));
  }, [dragging, pct]);

  return (
    <div
      ref={containerRef}
      className={cn("flex min-h-0 flex-col lg:flex-row", className)}
    >
      {/* flex-1 below lg so a lone pane fills the height; the .split-pane
          rule (unlayered, lg-only) overrides it with the dragged width. */}
      <div
        className="split-pane flex min-h-0 w-full flex-1 flex-col"
        style={{ "--split": `${pct}%` } as React.CSSProperties}
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panels"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        onMouseDown={() => setDragging(true)}
        onTouchStart={() => setDragging(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPct((p) => Math.max(min, p - 2));
          if (e.key === "ArrowRight") setPct((p) => Math.min(max, p + 2));
        }}
        className={cn(
          "group relative hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center border-x border-line bg-canvas transition-colors hover:bg-brand-500/30 focus-visible:bg-brand-500/40 lg:flex",
          dragging && "bg-brand-500/50"
        )}
      >
        <span className="pointer-events-none absolute h-10 w-1 rounded-full bg-line-strong transition-colors group-hover:bg-brand-500" />
      </div>

      <div className={cn("flex min-h-0 w-full flex-col lg:flex-1", rightClassName)}>
        {right}
      </div>
    </div>
  );
}
