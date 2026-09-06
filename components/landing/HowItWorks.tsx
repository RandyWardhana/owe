"use client";

import { useEffect, useRef, useState } from "react";

import { Camera, Share, Users } from "@/components/icons";

import Reveal from "./Reveal";
import { HOW_IT_WORKS } from "./data";

const ART = [Camera, Users, Share];

/* Three numbered boxes side by side let the eye skip all three. Pinning the
   art and advancing it as each step scrolls past makes the sequence something
   you move through, which is what a sequence is for. */
export default function HowItWorks() {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (!hit) return;
        const index = steps.current.findIndex((el) => el === hit.target);
        if (index >= 0) setActive(index);
      },
      /* A narrow band rather than "most visible": all three steps fit on a
         desktop screen at once, so whichever is largest wins the moment you
         start scrolling and the sequence skips straight to the last one. The
         band makes exactly one step -- the one crossing it -- active. */
      { threshold: 0, rootMargin: "-32% 0px -56% 0px" },
    );

    steps.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const Icon = ART[active];

  return (
    <section className="lp-section lp-section--alt lp-how" id="how">
      <div className="lp-wrap">
        <Reveal className="lp-section__head">
          <span className="lp-eyebrow">How it works</span>
          <h2 className="disp lp-h2">Three taps from bill to settled</h2>
        </Reveal>

        <div className="lp-how__grid">
          <div className="lp-how__stage" aria-hidden="true">
            <div className="lp-how__disc">
              <span className="lp-how__ring" />
              <span key={active} className="lp-how__icon">
                <Icon size={40} />
              </span>
              <span className="lp-how__stagenum disp">{HOW_IT_WORKS[active].num}</span>
            </div>
            <div className="lp-how__pips">
              {HOW_IT_WORKS.map((s, i) => (
                <span key={s.num} className={`lp-how__pip ${i === active ? "is-on" : ""}`} />
              ))}
            </div>
          </div>

          <ol className="lp-how__steps">
            {HOW_IT_WORKS.map((s, i) => (
              <li key={s.num}>
                <div
                  ref={(el) => {
                    steps.current[i] = el;
                  }}
                  className={`lp-step ${i === active ? "is-active" : ""}`}
                >
                  <span className="lp-step__num disp">{s.num}</span>
                  <h3 className="lp-step__title">{s.title}</h3>
                  <p className="lp-step__desc">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
