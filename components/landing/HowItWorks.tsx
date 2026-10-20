"use client";

import { Camera, Share, Users } from "@/components/icons";

import Reveal from "./Reveal";
import { useCopy } from "./copy";

const ICONS = [Camera, Users, Share];

/* Three numbered cards after the reference's "Get the most out of" pair: a
   flat grey card, the words top-left, and a lime blob with an icon breaking
   out of the bottom-right corner. They land one after another, which reads as
   the order of the steps without a single arrow. */
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
          {HOW.steps.map((s, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={s.num} as="li" delay={i * 120} className="lp-step lp-pop">
                <span className="lp-step__num disp">
                  {HOW.step} {s.num}
                </span>
                <h3 className="lp-step__title">{s.title}</h3>
                <p className="lp-step__desc">{s.desc}</p>
                <p className="lp-step__line">{s.line}</p>
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
