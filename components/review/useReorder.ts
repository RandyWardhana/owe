"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";

/* Drag-to-reorder for a vertical list, by a handle. Pointer events rather than
   HTML5 drag and drop, because the latter does nothing on touch screens -- and
   this list is almost always edited on a phone at the table.

   Rows are measured once when the drag starts; while it runs only transforms
   change, so nothing reflows until the drop commits the new order. */

const EDGE = 72; // px from the scroller's edge where auto-scroll kicks in
const SPEED = 12; // px per frame at the very edge

type Drag = { from: number; to: number; dy: number };

export function useReorder(count: number, onMove: (from: number, to: number) => void) {
  const rows = useRef<(HTMLElement | null)[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const live = useRef<{
    from: number;
    to: number;
    startY: number;
    pointerY: number;
    startScroll: number;
    scroller: HTMLElement | null;
    rects: { top: number; height: number }[];
    step: number;
    frame: number;
  } | null>(null);

  const update = useCallback(() => {
    const s = live.current;
    if (!s) return;
    const scrolled = (s.scroller?.scrollTop ?? 0) - s.startScroll;
    const dy = s.pointerY - s.startY + scrolled;
    const self = s.rects[s.from];
    const center = self.top + self.height / 2 + dy;
    let to = s.from;
    s.rects.forEach((r, i) => {
      const mid = r.top + r.height / 2;
      if (i < s.from && center < mid) to = Math.min(to, i);
      if (i > s.from && center > mid) to = Math.max(to, i);
    });
    s.to = to;
    setDrag({ from: s.from, to, dy });
  }, []);

  const tick = useCallback(() => {
    const s = live.current;
    if (!s) return;
    const box = s.scroller?.getBoundingClientRect();
    if (s.scroller && box) {
      const up = box.top + EDGE - s.pointerY;
      const down = s.pointerY - (box.bottom - EDGE);
      const by = up > 0 ? -Math.min(1, up / EDGE) * SPEED : down > 0 ? Math.min(1, down / EDGE) * SPEED : 0;
      if (by) {
        s.scroller.scrollTop += by;
        update();
      }
    }
    s.frame = requestAnimationFrame(tick);
  }, [update]);

  const end = useCallback(
    (commit: boolean) => {
      const s = live.current;
      if (!s) return;
      cancelAnimationFrame(s.frame);
      live.current = null;
      setDrag(null);
      if (commit && s.to !== s.from) onMove(s.from, s.to);
    },
    [onMove],
  );

  useEffect(() => () => end(false), [end]);

  const handleProps = (index: number) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || count < 2) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rects = rows.current.slice(0, count).map((el) => {
        const r = el?.getBoundingClientRect();
        return { top: r?.top ?? 0, height: r?.height ?? 0 };
      });
      const gap = rects.length > 1 ? rects[1].top - (rects[0].top + rects[0].height) : 0;
      const scroller = e.currentTarget.closest<HTMLElement>(".screen__scroll");
      live.current = {
        from: index,
        to: index,
        startY: e.clientY,
        pointerY: e.clientY,
        startScroll: scroller?.scrollTop ?? 0,
        scroller,
        rects,
        step: rects[index].height + gap,
        frame: 0,
      };
      live.current.frame = requestAnimationFrame(tick);
      setDrag({ from: index, to: index, dy: 0 });
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!live.current) return;
      live.current.pointerY = e.clientY;
      update();
    },
    onPointerUp: () => end(true),
    onPointerCancel: () => end(false),
    /* The same move from the keyboard: arrows shift the row by one. */
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const to = e.key === "ArrowUp" ? index - 1 : e.key === "ArrowDown" ? index + 1 : -1;
      if (to < 0 || to >= count) return;
      e.preventDefault();
      onMove(index, to);
    },
  });

  /* Where each row sits while a drag runs: the dragged one follows the
     finger, the ones it has passed slide over to make room. */
  const rowStyle = (index: number): CSSProperties | undefined => {
    if (!drag) return undefined;
    const { from, to, dy } = drag;
    if (index === from) {
      return { transform: `translateY(${dy}px)`, transition: "none", zIndex: 2, position: "relative" };
    }
    const step = live.current?.step ?? 0;
    const shift =
      from < to && index > from && index <= to ? -step : to < from && index >= to && index < from ? step : 0;
    return { transform: shift ? `translateY(${shift}px)` : undefined, transition: "transform 0.18s ease" };
  };

  const rowRef = (index: number) => (el: HTMLElement | null) => {
    rows.current[index] = el;
  };

  return { drag, handleProps, rowStyle, rowRef };
}
