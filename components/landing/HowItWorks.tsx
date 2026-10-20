"use client";

import { Camera, Share, Users } from "@/components/icons";

import Reveal from "./Reveal";
import { useCopy } from "./copy";

const ICONS = [Camera, Users, Share];

export default function HowItWorks() {
  const HOW = useCopy().how;
  return (
    <section className="lp-section lp-how" id="how">
      <div className="lp-wrap">
        <Reveal className="lp-head-left">
          <span className="lp-eyebrow">{HOW.eyebrow}</span>
          <h2 className="disp lp-h2">{HOW.title}</h2>
        </Reveal>

        <ol className="lp-steps">
          {HOW.steps.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={step.num} as="li" delay={i * 120} className="lp-step lp-pop">
                <span className="lp-step__num disp">
                  {HOW.step} {step.num}
                </span>
                <h3 className="lp-step__title">{step.title}</h3>
                <p className="lp-step__desc">{step.desc}</p>
                <p className="lp-step__line">{step.line}</p>
                <span className={`lp-step__art lp-step__art--${i}`} aria-hidden="true">
                  <span className="lp-step__blob" />
                  <span className="lp-step__icon">
                    <Icon size={24} />
                  </span>
                </span>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
