"use client";

import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import Hero from "./Hero";
import Features from "./Features";
import HowItWorks from "./HowItWorks";
import Faq from "./Faq";
import FinalCta from "./FinalCta";

export default function Landing() {
  return (
    <div className="landing">
      <nav className="lp-nav">
        <div className="lp-wrap lp-nav__inner">
          <Link href="/" className="lp-brand disp">
            owe
          </Link>
          <Link href="/" className="btn sm lp-nav__cta">
            Open the app <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      <main>
        <Hero />
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
            Open the app
          </Link>
        </div>
      </footer>
    </div>
  );
}
