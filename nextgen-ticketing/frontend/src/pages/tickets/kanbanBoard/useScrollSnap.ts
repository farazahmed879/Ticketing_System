import { useCallback, useEffect, useState } from "react";

/**
 * Adds snap-based horizontal navigation to a kanban board track:
 *  - tracks whether the user can scroll left / right (for edge affordances)
 *  - exposes scrollByColumn() that nudges one column at a time, smooth
 *  - attaches pointer drag-to-scroll while preserving native card drag-and-drop
 *    and not swallowing clicks
 *
 * Returns a *callback ref* (trackRef) so listeners attach when the track
 * actually mounts — not on the initial render when the parent might still
 * be showing a skeleton.
 */
export function useScrollSnap() {
  const [trackEl, setTrackEl] = useState<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Edge detection
  useEffect(() => {
    if (!trackEl) return;
    const el = trackEl;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      // 4px tolerance to avoid flicker at sub-pixel boundaries.
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Re-evaluate if column count changes (filter applied, etc.)
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: false });
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [trackEl]);

  // Drag-to-scroll. Disabled when the pointer starts on:
  //  - a draggable element (lets HTML5 drag-and-drop of cards work normally)
  //  - a button/link/interactive control
  //  - anything marked [data-no-drag]
  useEffect(() => {
    if (!trackEl) return;
    const el = trackEl;

    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let moved = false;
    let prevSnap = "";
    let prevCursor = "";

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (
        target.closest(
          '[draggable="true"], button, a, input, textarea, select, [data-no-drag]',
        )
      ) {
        return;
      }
      isDown = true;
      moved = false;
      startX = e.pageX;
      scrollStart = el.scrollLeft;
      prevSnap = el.style.scrollSnapType;
      prevCursor = el.style.cursor;
      el.style.scrollSnapType = "none";
      el.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.pageX - startX;
      if (!moved && Math.abs(dx) > 5) moved = true;
      if (moved) {
        e.preventDefault();
        el.scrollLeft = scrollStart - dx;
      }
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = prevCursor;
      el.style.scrollSnapType = prevSnap;
      if (moved) {
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        el.addEventListener("click", swallow, { capture: true, once: true });
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("pointerleave", endDrag);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("pointerleave", endDrag);
    };
  }, [trackEl]);

  const scrollByColumn = useCallback(
    (direction: 1 | -1) => {
      if (!trackEl) return;
      const first = trackEl.firstElementChild as HTMLElement | null;
      // step = first column width + the inter-column gap (20px in TicketBoard.module.css)
      const step = (first?.offsetWidth ?? trackEl.clientWidth * 0.8) + 20;
      trackEl.scrollBy({ left: step * direction, behavior: "smooth" });
    },
    [trackEl],
  );

  return {
    trackRef: setTrackEl,
    canScrollLeft,
    canScrollRight,
    scrollByColumn,
  };
}
