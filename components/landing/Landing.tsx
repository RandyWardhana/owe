"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";

import Hero from "./Hero";
import Marquee from "./Marquee";
import TrySplit from "./TrySplit";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import Faq from "./Faq";
import FinalCta from "./FinalCta";

export default function Landing() {
  const scroller = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;

    let queued = false;
    const measure = () => {
      queued = false;
      const travel = el.scrollHeight - el.clientHeight;
      setProgress(travel > 0 ? el.scrollTop / travel : 0);
      setLifted(el.scrollTop > 12);
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };

    measure();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing" ref={scroller}>
      <nav className={`lp-nav ${lifted ? "is-lifted" : ""}`}>
        <span
          className="lp-nav__progress"
          style={{ transform: `scaleX(${progress})` }}
          aria-hidden="true"
        />
        <div className="lp-wrap lp-nav__inner">
          <Link href="/" className="lp-brand disp">
            owe
          </Link>

          <div className="lp-nav__links">
            <a href="#try">Try it</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </div>

          <Link href="/" className="lp-nav__cta">
            Open the app <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      <main>
        <Hero />
        <Marquee />
        <TrySplit />
        <Features />
        <HowItWorks />
        <Faq />
        <FinalCta />
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer__inner">
          <span className="lp-brand disp">owe</span>
          <span className="lp-footer__tag">scan · split · settle</span>
          <Link href="/" className="lp-footer__link">
            Open the app <ArrowRight size={15} />
          </Link>
        </div>
      </footer>
    </div>
  );
}
