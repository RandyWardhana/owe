"use client";

import { useState } from "react";
import { Plus } from "@/components/icons";
import Reveal from "./Reveal";
import { useCopy } from "./copy";

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const copy = useCopy();
  const FAQS = copy.faqs;

  return (
    <section className="lp-section" id="faq">
      <div className="lp-wrap lp-wrap--narrow">
        <Reveal className="lp-section__head">
          <span className="lp-eyebrow">{copy.faqHead.eyebrow}</span>
          <h2 className="disp lp-h2">{copy.faqHead.title}</h2>
        </Reveal>

        <ul className="lp-faq">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal
                key={i}
                as="li"
                delay={i * 40}
                className={`lp-faq__item card ${isOpen ? "is-open" : ""}`}
              >
                  <button
                    type="button"
                    className="lp-faq__q"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span>{item.q}</span>
                    <span className="lp-faq__caret">
                      <Plus size={18} />
                    </span>
                  </button>
                  <div className="lp-faq__a">
                    <div>
                      <p>{item.a}</p>
                    </div>
                  </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
