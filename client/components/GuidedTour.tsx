import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Step = {
  selector: string;
  title: string;
  description?: string;
  placement?: "top" | "bottom";
};

type Props = {
  steps: Step[];
  open: boolean;
  onClose: () => void;
};

export default function GuidedTour({ steps, open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [navSize, setNavSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const maskId = useId();

  const currentStep = steps[index];

  const target = useMemo(() => {
    if (!open || !currentStep) return null;
    return document.querySelector(currentStep.selector) as HTMLElement | null;
  }, [open, currentStep]);

  const recalcRect = useCallback(() => {
    if (!open || !target) {
      setTargetRect(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    setTargetRect(rect);
  }, [open, target]);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    recalcRect();
  }, [open, recalcRect]);

  useEffect(() => {
    if (!open) return;
    const handle = () => recalcRect();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    const ro = typeof ResizeObserver !== "undefined" && target ? new ResizeObserver(handle) : null;
    if (ro && target) ro.observe(target);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
      ro?.disconnect();
    };
  }, [open, recalcRect, target]);

  useLayoutEffect(() => {
    if (!open) return;
    if (!tooltipRef.current) return;
    const measure = () => {
      if (!tooltipRef.current) return;
      const rect = tooltipRef.current.getBoundingClientRect();
      setTooltipSize({ width: rect.width, height: rect.height });
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && tooltipRef.current) ro.observe(tooltipRef.current);
    return () => ro?.disconnect();
  }, [open, currentStep]);

  useEffect(() => {
    if (!open) return;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((prev) => Math.min(steps.length - 1, prev + 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener("keydown", handleKey);
    const preventScroll = (event: Event) => {
      event.preventDefault();
    };
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
    };
  }, [open, onClose, steps.length]);

  useEffect(() => {
    if (!open) return;
    const focusable = () =>
      Array.from(
        navRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((node) => !node.hasAttribute("disabled"));
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const nodes = focusable();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    const nextButton = navRef.current?.querySelector<HTMLButtonElement>('[data-tour-action="next"]');
    nextButton?.focus();
    return () => document.removeEventListener("keydown", trap);
  }, [open, index]);

  useLayoutEffect(() => {
    if (!open) return;
    if (!navRef.current) return;
    const measure = () => {
      if (!navRef.current) return;
      const rect = navRef.current.getBoundingClientRect();
      setNavSize({ width: rect.width, height: rect.height });
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && navRef.current) ro.observe(navRef.current);
    return () => ro?.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!currentStep) return;
    const element = document.querySelector(currentStep.selector) as HTMLElement | null;
    if (!element) return;
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });
  }, [open, currentStep]);

  if (!open || !currentStep) return null;

  const padding = 12;
  const highlight = targetRect
    ? {
        x: targetRect.left - padding,
        y: targetRect.top - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }
    : null;
  const highlightRadius = 14;

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;

  const placement = currentStep.placement;
  const preferTop =
    placement === "top" ||
    (placement !== "bottom" &&
      highlight &&
      highlight.y >= tooltipSize.height + padding * 2);

  let tooltipLeft = highlight ? highlight.x + highlight.width / 2 - tooltipSize.width / 2 : viewportWidth / 2 - tooltipSize.width / 2;
  tooltipLeft = Math.min(Math.max(tooltipLeft, 16), viewportWidth - tooltipSize.width - 16);

  let tooltipTop: number;
  if (!highlight) {
    tooltipTop = viewportHeight / 2 - tooltipSize.height / 2;
  } else if (preferTop) {
    tooltipTop = highlight.y - tooltipSize.height - 16;
  } else {
    tooltipTop = highlight.y + highlight.height + 16;
    if (tooltipTop + tooltipSize.height > viewportHeight - 16 && highlight.y > tooltipSize.height) {
      tooltipTop = highlight.y - tooltipSize.height - 16;
    }
  }
  tooltipTop = Math.min(Math.max(tooltipTop, 16), viewportHeight - tooltipSize.height - 16);

  if (highlight) {
    const highlightRight = highlight.x + highlight.width;
    const tooltipRight = tooltipLeft + tooltipSize.width;
    const overlapHorizontally =
      tooltipLeft < highlightRight && tooltipRight > highlight.x;
    const overlapVertically =
      tooltipTop < highlight.y + highlight.height &&
      tooltipTop + tooltipSize.height > highlight.y;
    if (overlapHorizontally && overlapVertically) {
      const spaceRight = viewportWidth - highlightRight - 16;
      const spaceLeft = highlight.x - 16;
      if (spaceRight >= tooltipSize.width) {
        tooltipLeft = highlightRight + 16;
      } else if (spaceLeft >= tooltipSize.width) {
        tooltipLeft = highlight.x - tooltipSize.width - 16;
      } else {
        tooltipTop = Math.max(16, highlight.y - tooltipSize.height - 16);
        tooltipLeft = Math.min(Math.max(tooltipLeft, 16), viewportWidth - tooltipSize.width - 16);
      }
    }
  }

  const navBottomMargin = 24; // matches bottom-6
  const navSpaceTop = viewportHeight - navSize.height - navBottomMargin - 16;
  const tooltipBottom = tooltipTop + tooltipSize.height;
  if (tooltipBottom > navSpaceTop) {
    tooltipTop = Math.max(16, navSpaceTop - tooltipSize.height);
  }

  const stepNotVisible = !highlight;

  const goNext = () => {
    if (index === steps.length - 1) {
      onClose();
    } else {
      setIndex((prev) => Math.min(steps.length - 1, prev + 1));
    }
  };
  const goBack = () => setIndex((prev) => Math.max(0, prev - 1));

  return createPortal(
    <div className="fixed inset-0 z-[1000] pointer-events-auto" aria-modal="true" role="dialog">
      <svg className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden focusable="false">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {!stepNotVisible && (
              <rect
                x={highlight!.x}
                y={highlight!.y}
                width={highlight!.width}
                height={highlight!.height}
                rx={highlightRadius}
                ry={highlightRadius}
                fill="black"
              />
            )}
          </mask>
        </defs>
      </svg>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "rgba(6, 6, 6, 0.72)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          mask: `url(#${maskId})`,
          WebkitMask: `url(#${maskId})`,
        }}
      />

      {!stepNotVisible && (
        <div
          aria-hidden
          className="pointer-events-none absolute border border-red-400/90 shadow-[0_0_24px_rgba(248,113,113,0.6)]"
          style={{
            left: highlight!.x,
            top: highlight!.y,
            width: highlight!.width,
            height: highlight!.height,
            borderRadius: highlightRadius,
          }}
        />
      )}

      <div
        ref={tooltipRef}
        className={cn(
          "pointer-events-auto absolute max-w-sm rounded-xl border border-red-900/40 bg-black/85 p-4 text-sm text-red-100 shadow-xl backdrop-blur",
        )}
        style={{ left: tooltipLeft, top: tooltipTop }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold uppercase tracking-widest">{currentStep.title}</h2>
          <span className="text-xs text-red-200/80">
            {index + 1}/{steps.length}
          </span>
        </div>
        <div className="mt-2 text-xs text-red-200/80">
          {stepNotVisible ? "This step’s target is hidden. Continue to the next step." : currentStep.description}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center">
        <div
          ref={navRef}
          className="pointer-events-auto flex items-center gap-3 rounded-full border border-red-900/50 bg-black/80 px-4 py-2 text-xs text-red-100 shadow-lg backdrop-blur"
          role="toolbar"
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-red-900/40 bg-black/60 px-3 py-1.5 transition hover:bg-red-900/40"
          >
            Close
          </button>
          <button
            type="button"
            onClick={goBack}
            disabled={index === 0}
            className="rounded-full border border-red-900/40 bg-black/60 px-3 py-1.5 transition enabled:hover:bg-red-900/40 disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            data-tour-action="next"
            onClick={goNext}
            className="rounded-full border border-red-500/70 bg-red-600/30 px-4 py-1.5 font-semibold uppercase tracking-widest transition hover:bg-red-600/40"
          >
            {index === steps.length - 1 ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}


