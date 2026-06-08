"use client";

import type { PointerEvent, ReactNode, TransitionEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { useStore } from "@/lib/store";
import { useEscapeKey } from "@/lib/hooks";

import { X } from "./icons";

const DRAG_CLOSE_PX = 110; // drag at least this far down to dismiss

/* Bottom-sheet primitive: a backdrop + a sheet that slides up. Animates both
   in AND out, closes on backdrop tap / close button / Escape, and can be
   dragged down by its grip to dismiss.

   Performance: the live drag offset is written straight to the DOM as a CSS
   variable (--drag) — no React re-render per pointer frame. State only changes
   on open/close and drag start/end, so the (potentially heavy) sheet body
   isn't re-rendered while you're dragging. */
export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}) {
  const anim = useStore((s) => s.anim);

  const [render, setRender] = useState(open);
  const [openCls, setOpenCls] = useState(false);
  const [dragging, setDragging] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startY = useRef(0);
  const dragY = useRef(0);

  useEscapeKey(onClose, open);

  // Mount as soon as we're asked to open.
  useEffect(() => {
    if (open) setRender(true);
  }, [open]);

  // Drive the enter / exit transition whenever open or render flips.
  useEffect(() => {
    if (!render) return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const instant = !anim || reduce;

    if (open) {
      if (instant) {
        setOpenCls(true);
        return;
      }
      // next frame, so the slide-up transition actually runs from translateY(100%)
      const id = requestAnimationFrame(() => setOpenCls(true));
      return () => cancelAnimationFrame(id);
    }

    setOpenCls(false);
    if (instant) setRender(false);
  }, [open, render, anim]);

  if (!render) return null;

  const reduce =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const instant = !anim || reduce;

  const onTransitionEnd = (e: TransitionEvent) => {
    if (
      e.target === sheetRef.current &&
      e.propertyName === "transform" &&
      !openCls &&
      !draggingRef.current
    ) {
      setRender(false);
    }
  };

  // ---- drag-to-dismiss (from the grip / header) ----
  const onPointerDown = (e: PointerEvent) => {
    // let the close button (and any control in the header) work normally
    if ((e.target as HTMLElement).closest("button")) return;
    startY.current = e.clientY;
    dragY.current = 0;
    draggingRef.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!draggingRef.current) return;
    const dy = Math.max(0, e.clientY - startY.current);
    dragY.current = dy;
    // imperative — no React render this frame
    sheetRef.current?.style.setProperty("--drag", `${dy}px`);
    backdropRef.current?.style.setProperty(
      "--bd",
      String(Math.max(0, 1 - dy / 320)),
    );
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    if (dragY.current > DRAG_CLOSE_PX) {
      setOpenCls(false); // transition from the dragged position out
      onClose();
    }
    // else: openCls stays true → springs back to translateY(0)
  };

  const cls = (base: string) =>
    base +
    (openCls ? " is-open" : "") +
    (dragging ? " is-dragging" : "") +
    (instant ? " is-instant" : "");

  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <div ref={backdropRef} className={cls("sheet-backdrop")} onClick={onClose} />
      <div ref={sheetRef} className={cls("sheet")} onTransitionEnd={onTransitionEnd}>
        <div
          className="sheet__head"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: "none", cursor: "grab" }}
        >
          <div className="sheet__grip" />
          <div className="row between" style={{ width: "100%" }}>
            {title ? <h2 className="disp sheet__title">{title}</h2> : <span />}
            <button className="iconbtn ghost" aria-label="close" onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </div>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}
