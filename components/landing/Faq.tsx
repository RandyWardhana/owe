"use client";

import { useState } from "react";
import { Chevron } from "@/components/icons";
import Reveal from "./Reveal";
import { FAQS } from "./data";

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="lp-section" id="faq">
      <div className="lp-wrap lp-wrap--narrow">
        <Reveal className="lp-section__head">
          <span className="lp-eyebrow">Good to know</span>
          <h2 className="disp lp-h2">Questions, answered</h2>
        </Reveal>

        <Reveal>
          <ul className="lp-faq">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              return (
                <li key={item.q} className={`lp-faq__item card ${isOpen ? "is-open" : ""}`}>
                  <button
                    type="button"
                    className="lp-faq__q"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span>{item.q}</span>
                    <Chevron size={20} className="lp-faq__caret" />
                  </button>
                  <div className="lp-faq__a">
                    <p>{item.a}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
