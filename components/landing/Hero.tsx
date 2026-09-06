"use client";

import Link from "next/link";
import { ArrowRight, Camera, Check } from "@/components/icons";

import HeroDemo from "./HeroDemo";
import { HERO } from "./data";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Hero() {
  let word = 0;

  return (
    <header className="lp-hero">
      <span className="lp-hero__glow" aria-hidden="true" />

      <div className="lp-wrap lp-hero__inner">
        <div className="lp-hero__copy">
          <span className="lp-eyebrow lp-hero__eyebrow">{HERO.eyebrow}</span>

          <h1 className="disp lp-hero__title">
            {HERO.title.map((line, i) => (
              <span key={i} className="lp-hero__line">
                {line.split(" ").map((text) => (
                  <span key={`${text}-${word}`} className="lp-hero__word">
                    <span style={{ ["--w" as string]: word++ }}>{text}</span>
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <p className="lp-lead lp-hero__lead">{HERO.lead}</p>

          <div className="lp-hero__cta">
            <Link href="/" className="lp-cta lp-cta--go">
              <Camera size={19} /> {HERO.primary}
              <ArrowRight size={17} className="lp-cta__arrow" />
            </Link>
            <button type="button" className="lp-cta lp-cta--ghost" onClick={() => scrollTo("try")}>
              {HERO.secondary}
            </button>
          </div>

          <ul className="lp-checks">
            {HERO.checks.map((c, i) => (
              <li key={c} style={{ ["--i" as string]: i }}>
                <span className="lp-check">
                  <Check size={12} />
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <HeroDemo />
      </div>
    </header>
  );
}
