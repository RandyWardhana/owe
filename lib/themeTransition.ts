import { flushSync } from "react-dom";

import type { TransitionOrigin, Vector } from "../entities/appearance";
import type { Theme } from "../entities/settings";

const FRAMES = 40;
const DURATION = 1000;
const OLD_VIEW = "::view-transition-old(root)";
const NEW_VIEW = "::view-transition-new(root)";

const easeInOut = (progress: number) =>
  progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

const toPolygon = (points: Vector[]) =>
  `polygon(${points.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(", ")})`;

function reach({ x, y }: TransitionOrigin): number {
  const width = window.innerWidth;
  const height = window.innerHeight;
  return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
}

function sunburst(origin: TransitionOrigin, far: number, progress: number): Vector[] {
  const rays = 12;
  const vertices = rays * 2;
  const outer = (far / Math.cos(Math.PI / vertices)) * 1.04 * progress;
  const depth = 0.38 + 0.62 * progress * progress * progress;
  const spin = progress * Math.PI * 0.8;
  const points: Vector[] = [];
  for (let i = 0; i < vertices; i++) {
    const radius = i % 2 ? outer * depth : outer;
    const angle = spin + (i * Math.PI) / rays;
    points.push([origin.x + radius * Math.cos(angle), origin.y + radius * Math.sin(angle)]);
  }
  return points;
}

function crescent(origin: TransitionOrigin, far: number, progress: number): Vector[] {
  const steps = 24;
  const radius = Math.max((far / Math.cos(Math.PI / (steps - 1))) * 1.04 * progress, 0.01);
  const offset = Math.min(0.7 + 1.3 * Math.pow(progress, 1.4), 2) * radius;
  const theta = Math.acos(Math.min(1, offset / (2 * radius)));
  const tilt = -Math.PI / 4 + progress * 0.9;
  const cutterX = origin.x + offset * Math.cos(tilt);
  const cutterY = origin.y + offset * Math.sin(tilt);
  const points: Vector[] = [];
  for (let i = 0; i < steps; i++) {
    const angle = tilt + theta + ((2 * Math.PI - 2 * theta) * i) / (steps - 1);
    points.push([origin.x + radius * Math.cos(angle), origin.y + radius * Math.sin(angle)]);
  }
  for (let i = 0; i < steps; i++) {
    const angle = tilt + Math.PI + theta - (2 * theta * i) / (steps - 1);
    points.push([cutterX + radius * Math.cos(angle), cutterY + radius * Math.sin(angle)]);
  }
  return points;
}

function revealFrames(next: Theme, origin: TransitionOrigin): Keyframe[] {
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

export function originOf(event: { clientX: number; clientY: number; currentTarget: Element }): TransitionOrigin {
  if (event.clientX || event.clientY) return { x: event.clientX, y: event.clientY };
  const box = event.currentTarget.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

export function switchTheme(next: Theme, apply: (theme: Theme) => void, origin?: TransitionOrigin): void {
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
