import { flushSync } from "react-dom";

import type { Theme } from "./types";

export type Origin = { x: number; y: number };

type Vec = [number, number];

const FRAMES = 40;
const DURATION = 1000;
const OLD_VIEW = "::view-transition-old(root)";
const NEW_VIEW = "::view-transition-new(root)";

const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const toPolygon = (points: Vec[]) =>
  `polygon(${points.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})`;

function reach({ x, y }: Origin): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
}

function sunburst(o: Origin, far: number, p: number): Vec[] {
  const rays = 12;
  const n = rays * 2;
  const outer = (far / Math.cos(Math.PI / n)) * 1.04 * p;
  const depth = 0.38 + 0.62 * p * p * p;
  const spin = p * Math.PI * 0.8;
  const points: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const r = i % 2 ? outer * depth : outer;
    const a = spin + (i * Math.PI) / rays;
    points.push([o.x + r * Math.cos(a), o.y + r * Math.sin(a)]);
  }
  return points;
}

function crescent(o: Origin, far: number, p: number): Vec[] {
  const n = 24;
  const r = Math.max((far / Math.cos(Math.PI / (n - 1))) * 1.04 * p, 0.01);
  const d = Math.min(0.7 + 1.3 * Math.pow(p, 1.4), 2) * r;
  const theta = Math.acos(Math.min(1, d / (2 * r)));
  const tilt = -Math.PI / 4 + p * 0.9;
  const sx = o.x + d * Math.cos(tilt);
  const sy = o.y + d * Math.sin(tilt);
  const points: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const a = tilt + theta + ((2 * Math.PI - 2 * theta) * i) / (n - 1);
    points.push([o.x + r * Math.cos(a), o.y + r * Math.sin(a)]);
  }
  for (let i = 0; i < n; i++) {
    const a = tilt + Math.PI + theta - (2 * theta * i) / (n - 1);
    points.push([sx + r * Math.cos(a), sy + r * Math.sin(a)]);
  }
  return points;
}

function revealFrames(next: Theme, origin: Origin): Keyframe[] {
  const far = reach(origin);
  const shape = next === "dark" ? crescent : sunburst;
  return Array.from({ length: FRAMES + 1 }, (_, i) => ({
    clipPath: toPolygon(shape(origin, far, easeInOut(i / FRAMES))),
  }));
}

function oldViewFrames(next: Theme): Keyframe[] {
  return next === "dark"
    ? [
        { filter: "brightness(1) saturate(1)", transform: "scale(1)" },
        { filter: "brightness(0.45) saturate(0.6)", transform: "scale(0.97)" },
      ]
    : [
        { filter: "brightness(1)", transform: "scale(1)" },
        { filter: "brightness(1.35)", transform: "scale(1.02)" },
      ];
}

export function originOf(event: { clientX: number; clientY: number; currentTarget: Element }): Origin {
  if (event.clientX || event.clientY) return { x: event.clientX, y: event.clientY };
  const box = event.currentTarget.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

export function switchTheme(next: Theme, apply: (theme: Theme) => void, origin?: Origin): void {
  const root = document.documentElement;
  const commit = () => {
    flushSync(() => apply(next));
    root.setAttribute("data-theme", next);
  };

  const still =
    root.getAttribute("data-theme") === next ||
    root.getAttribute("data-anim") === "off" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    typeof document.startViewTransition !== "function";

  if (still) {
    root.classList.add("theme-switching");
    commit();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.classList.remove("theme-switching")),
    );
    return;
  }

  const from = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  root.classList.add("theme-switching", "theme-reveal", `theme-reveal--${next}`);
  const transition = document.startViewTransition(commit);

  transition.ready
    .then(() => {
      root.animate(revealFrames(next, from), {
        duration: DURATION,
        easing: "linear",
        fill: "both",
        pseudoElement: NEW_VIEW,
      });
      root.animate(oldViewFrames(next), {
        duration: DURATION,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "both",
        pseudoElement: OLD_VIEW,
      });
    })
    .catch(() => {});

  transition.finished.then(() => {
    root.classList.remove("theme-switching", "theme-reveal", `theme-reveal--${next}`);
  });
}
