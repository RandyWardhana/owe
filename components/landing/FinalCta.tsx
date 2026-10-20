"use client";

import Link from "next/link";
import { ArrowRight, WifiOff } from "@/components/icons";

import Reveal from "./Reveal";
import { useCopy } from "./copy";
import { track } from "@/lib/analytics";

export default function FinalCta() {
  const FINAL = useCopy().final;
  return (
    <section className="lp-final">
      <svg
        className="lp-scribble lp-final__line"
        viewBox="0 0 300 260"
        preserveAspectRatio="none"
        data-draw
        aria-hidden="true"
      >
        <path
          pathLength={1}
          d="M150 0 C 150 40, 70 50, 80 96 C 90 140, 200 110, 206 150 C 212 196, 110 176, 132 222 C 140 238, 150 246, 150 258"
        />
      </svg>

      <div className="lp-wrap">
        <Reveal className="lp-final__inner">
          <h2 className="disp lp-final__title">
            {FINAL.title.map((line, i) => (
              <span key={i} className="lp-hero__line">
                {line}
              </span>
            ))}
          </h2>
          <p className="lp-final__lead">{FINAL.lead}</p>
          <Link href="/" className="lp-cta lp-cta--ink lp-final__btn" onClick={() => track("landing_cta", { location: "final" })}>
            {FINAL.button} <ArrowRight size={18} />
          </Link>
          <p className="lp-final__install">
            <WifiOff size={14} /> {FINAL.install}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
