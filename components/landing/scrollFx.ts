"use client";

import { useEffect } from "react";

/* The two scroll-linked moves from the motion reference, driven from the
   landing's own scroll container (the app body is fixed, so the window never
   scrolls here):

   - [data-parallax="0.08"]: drifts against the scroll by that fraction of its
     distance from the viewport's middle, so the lime blobs and the banner's
     phone sit on a slightly different plane from the text.
   - svg[data-draw]: its paths (pathLength=1) draw in as the svg crosses the
     viewport, the way the reference's doodle line follows you down the page.

   One rAF per scroll frame for both. With motion off (OS setting or owe's own
   switch) nothing moves: parallax stays at rest and every line is drawn. */
export function useScrollFx(scroller: React.RefObject<HTMLElement | null>, play: boolean): void {
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;

    const parallax = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));
    const lines = Array.from(root.querySelectorAll<SVGSVGElement>("svg[data-draw]"));

    if (!play) {
      parallax.forEach((el) => (el.style.transform = ""));
      lines.forEach((svg) => svg.querySelectorAll("path").forEach((p) => (p.style.strokeDashoffset = "0")));
      return;
    }

    let queued = false;
    const frame = () => {
      queued = false;
      const vh = root.clientHeight;

      parallax.forEach((el) => {
        const speed = Number(el.dataset.parallax) || 0;
        const box = el.getBoundingClientRect();
        const offset = (box.top + box.height / 2 - vh / 2) * speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });

      lines.forEach((svg) => {
        const box = svg.getBoundingClientRect();
        // 0 as its top enters the bottom of the screen, 1 once its bottom
        // reaches two thirds of the way up.
        const travel = vh * 0.85 + box.height * 0.4;
        const progress = Math.min(1, Math.max(0, (vh - box.top) / travel));
        svg.querySelectorAll("path").forEach((p) => {
          p.style.strokeDashoffset = String(1 - progress);
        });
      });
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(frame);
    };

    frame();
    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [scroller, play]);
}
