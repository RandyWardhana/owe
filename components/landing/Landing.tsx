"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import Settings from "@/components/Settings";
import { useStore } from "@/lib/store";
import { useMounted, useAppliedAppearance } from "@/lib/hooks";
import { translate } from "@/lib/i18n";

import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import TrySplit from "./TrySplit";
import Perks from "./Perks";
import Banner from "./Banner";
import Faq from "./Faq";
import FinalCta from "./FinalCta";
import { COPY } from "./data";
import { LandingLangProvider } from "./copy";
import { usePlayful } from "./motion";
import { useScrollFx } from "./scrollFx";
import SettingsMenu from "./SettingsMenu";
import { track } from "@/lib/analytics";

export default function Landing() {
  const scroller = useRef<HTMLDivElement>(null);
  const [lifted, setLifted] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const play = usePlayful();

  // English for the server render and the first client one, then the saved
  // language (see ./copy for why).
  const mounted = useMounted();
  const savedLang = useStore((s) => s.lang);
  const lang = mounted ? savedLang : "en";
  const copy = COPY[lang];
  useAppliedAppearance();
  useScrollFx(scroller, play && mounted);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    const container = scroller.current;
    if (!container) return;
    const onScroll = () => setLifted(container.scrollTop > 12);
    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#how", label: copy.nav.how },
    { href: "#try", label: copy.nav.try },
    { href: "#faq", label: copy.nav.faq },
  ];

  return (
    <LandingLangProvider value={lang}>
      <div className="landing" ref={scroller}>
        <nav className={`lp-nav ${lifted ? "is-lifted" : ""}`}>
          <div className="lp-nav__pill">
            <Link href="/" className="lp-brand disp">
              owe
            </Link>

            <div className="lp-nav__links">
              {links.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>

            <SettingsMenu
              label={translate(lang, "settings.title")}
              onOpenSheet={() => setSettingsOpen(true)}
            />

            <Link href="/" className="lp-nav__cta" onClick={() => track("landing_cta", { location: "nav" })}>
              {copy.nav.open}
            </Link>
          </div>
        </nav>

        <main>
          <Hero />
          <HowItWorks />
          <TrySplit />
          <Perks />
          <Banner />
          <Faq />
          <FinalCta />
        </main>

        <footer className="lp-footer">
          <div className="lp-wrap lp-footer__inner">
            <div className="lp-footer__brand">
              <span className="lp-brand disp">owe</span>
              <span className="lp-footer__tag">{copy.footer.tag}</span>
            </div>

            <nav className="lp-footer__links" aria-label="Footer">
              {links.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
              <Link href="/" className="lp-footer__link" onClick={() => track("landing_cta", { location: "footer" })}>
                {copy.nav.open} <ArrowRight size={15} />
              </Link>
            </nav>

            <p className="lp-footer__fine">{copy.footer.fine}</p>
          </div>
        </footer>

      </div>

      {/* Outside the scroll container: the sheet positions against its nearest
          positioned parent, which would otherwise be the scrolling page. */}
      <div className="lp-overlay">
        <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} appearanceOnly />
      </div>
    </LandingLangProvider>
  );
}
