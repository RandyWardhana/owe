"use client";

import { useEffect, useRef } from "react";

import { useStore } from "@/lib/store";

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

const SPARK_COUNT = 8;
const SPARK_RADIUS = 18;
const SPARK_LENGTH = 10;
const DURATION = 420;
const easeOut = (t: number) => t * (2 - t);

export default function ClickSpark() {
  const anim = useStore((s) => s.anim);
  const animRef = useRef(anim);
  animRef.current = anim;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const sparks: Spark[] = [];
    let color = "#9be52e";
    let raf: number | null = null;

    const draw = (now: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        const p = (now - s.startTime) / DURATION;
        if (p >= 1) {
          sparks.splice(i, 1);
          continue;
        }
        const eased = easeOut(p);
        const dist = eased * SPARK_RADIUS;
        const len = SPARK_LENGTH * (1 - eased);
        const cos = Math.cos(s.angle);
        const sin = Math.sin(s.angle);
        ctx.globalAlpha = 1 - eased;
        ctx.beginPath();
        ctx.moveTo(s.x + dist * cos, s.y + dist * sin);
        ctx.lineTo(s.x + (dist + len) * cos, s.y + (dist + len) * sin);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (sparks.length > 0) {
        raf = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        raf = null;
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!animRef.current || reduce) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest("button")) return;

      color =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent")
          .trim() || color;

      const now = performance.now();
      for (let i = 0; i < SPARK_COUNT; i++) {
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          angle: (2 * Math.PI * i) / SPARK_COUNT,
          startTime: now,
        });
      }
      if (raf === null) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("click", onClick);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
