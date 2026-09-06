"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";

import Reveal from "./Reveal";
import { usePlayful } from "./motion";
import { FINAL_CTA } from "./data";

/* The button leans toward the cursor. Pointer-only and tiny in amplitude --
   enough to make the last thing on the page feel alive without turning the one
   action that matters into a moving target. */
export default function FinalCta() {
  const play = usePlayful();
  const btn = useRef<HTMLAnchorElement>(null);

  const lean = (e: React.MouseEvent) => {
    const el = btn.current;
    if (!el || !play || !window.matchMedia("(pointer: fine)").matches) return;
    const box = el.getBoundingClientRect();
    const x = (e.clientX - (box.left + box.width / 2)) / box.width;
    const y = (e.clientY - (box.top + box.height / 2)) / box.height;
    el.style.transform = `translate(${x * 10}px, ${y * 8}px)`;
  };

  const settle = () => {
    if (btn.current) btn.current.style.transform = "";
  };

  return (
    <section className="lp-final">
      <span className="lp-final__glow" aria-hidden="true" />
      <div className="lp-wrap">
        <Reveal className="lp-final__inner">
          <h2 className="disp lp-final__title">{FINAL_CTA.title}</h2>
          <p className="lp-final__lead">{FINAL_CTA.lead}</p>
          <div className="lp-final__pad" onMouseMove={lean} onMouseLeave={settle}>
            <Link href="/" ref={btn} className="lp-final__btn">
              {FINAL_CTA.button} <ArrowRight size={20} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
