"use client";

import Link from "next/link";
import { ArrowRight, Copy } from "@/components/icons";
import { personColor, personInk } from "@/lib/util";

import Reveal from "./Reveal";
import { PEOPLE } from "./data";
import { useCopy } from "./copy";
import { track } from "@/lib/analytics";

const SHARES = [115575, 99475, 73600];

/* The reference's dark "Keep your finger on the pulse" banner: a black card
   with a scribble, the line and the button, and a phone that breaks out of its
   top edge. The phone shows what a friend actually opens -- the shared bill,
   each share, a Copy for the payment number -- because that page is the
   argument for "no app needed". */
export default function Banner() {
  const BANNER = useCopy().banner;
  return (
    <section className="lp-banner-wrap">
      <div className="lp-wrap">
        <Reveal className="lp-banner">
          <svg className="lp-scribble lp-banner__scribble" viewBox="0 0 220 90" aria-hidden="true">
            <path pathLength={1} d="M4 70 C 30 70, 34 20, 60 22 C 86 24, 70 64, 98 62 C 130 60, 120 14, 160 16 C 186 18, 196 40, 216 34" />
          </svg>

          <div className="lp-banner__copy">
            <h2 className="disp lp-banner__title">{BANNER.title}</h2>
            <p className="lp-banner__lead">{BANNER.lead}</p>
            <Link href="/" className="lp-cta lp-cta--light" onClick={() => track("landing_cta", { location: "banner" })}>
              {BANNER.button} <ArrowRight size={17} />
            </Link>
          </div>

          <div className="lp-banner__phone" data-parallax="-0.06" aria-hidden="true">
            <div className="lp-mini">
              <div className="lp-mini__head">
                <span className="lp-mini__title">{BANNER.phoneTitle}</span>
                <span className="lp-mini__total disp">Rp 288.650</span>
              </div>
              {PEOPLE.slice(0, 3).map((person, i) => (
                <div key={person.name} className="lp-mini__row">
                  <span
                    className="lp-mini__av"
                    style={{ background: personColor(person.swatch), color: personInk(person.swatch) }}
                  >
                    {person.name[0]}
                  </span>
                  <span className="lp-mini__name">{person.name}</span>
                  <span className="lp-mini__amt tnum">{SHARES[i].toLocaleString("id-ID")}</span>
                </div>
              ))}
              <div className="lp-mini__pay">
                <span>
                  <b>GoPay</b> · 0812 •••• 4417
                </span>
                <span className="lp-mini__copy">
                  <Copy size={12} /> {BANNER.copy}
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
