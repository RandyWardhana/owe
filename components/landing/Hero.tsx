"use client";

import Link from "next/link";
import { Camera, Check, Receipt, Users, Wallet, WifiOff, Lock, Sparkle } from "@/components/icons";
import { personColor, personInk } from "@/lib/util";

import { PEOPLE } from "./data";
import { PAY_BRANDS } from "./payBrands";
import { useCopy } from "./copy";
import { track } from "@/lib/analytics";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* Bubbles on the rings. `r` is the ring (0 = inner), `a` the angle in degrees
   measured clockwise from 3 o'clock. The angles are chosen against the copy
   block, not for symmetry: each one sits just outside the headline and the
   lead, and clear of the chips and the stat card below. The outer ring is
   drawn but carries no bubbles -- at its radius they fall off the frame. */
const ORBIT: {
  r: 0 | 1 | 2;
  a: number;
  p?: number;
  icon?: "receipt" | "wallet" | "camera" | "users";
}[] = [
  { r: 0, a: 200, p: 0 },
  { r: 0, a: 340, icon: "receipt" },
  { r: 0, a: 160, icon: "wallet" },
  { r: 0, a: 20, p: 2 },
  { r: 1, a: 205, icon: "camera" },
  { r: 1, a: 335, p: 1 },
  { r: 1, a: 168, p: 3 },
  { r: 1, a: 12, icon: "users" },
];

const ICONS = { receipt: Receipt, wallet: Wallet, camera: Camera, users: Users };
const BADGE_ICONS = [Sparkle, Lock, WifiOff];

/* The hero, after two references: the centred layout with icons on
   concentric rings and a glowing stack of live cards (Deflexai), and the
   frosted floating chips with one big number (Grow+). Unlike Deflexai it is
   not boxed in a card: it sits on the page itself, so the rings run the full
   width and fade out rather than being cut off by a frame. The rings carry the
   people and the bill rather than partner logos -- that is what owe splits --
   and the payment logos sit in the strip at the bottom, as the "trusted by"
   row. */
export default function Hero() {
  const HERO = useCopy().hero;
  let word = 0;

  return (
    <header className="lp-hero">
      <div className="lp-hero__frame">
        {/* Full-bleed and faded out at the bottom, so the rings dissolve into
            the page instead of stopping at an edge. */}
        <div className="lp-orbit" aria-hidden="true">
          <div className="lp-orbit__center">
          <span className="lp-orbit__ring lp-orbit__ring--0" />
          <span className="lp-orbit__ring lp-orbit__ring--1" />
          <span className="lp-orbit__ring lp-orbit__ring--2" />
          {ORBIT.map((b, i) => {
            const Icon = b.icon ? ICONS[b.icon] : null;
            const person = b.p !== undefined ? PEOPLE[b.p] : null;
            return (
              <span
                key={i}
                className={`lp-orbit__bubble lp-orbit__bubble--r${b.r}`}
                style={{ ["--a" as string]: `${b.a}deg`, ["--d" as string]: `${(i % 5) * -0.9}s` }}
              >
                {person ? (
                  <span
                    className="lp-orbit__face"
                    style={{ background: personColor(person.swatch), color: personInk(person.swatch) }}
                  >
                    {person.name[0]}
                  </span>
                ) : Icon ? (
                  <Icon size={22} />
                ) : null}
              </span>
            );
          })}
          </div>
        </div>

        <div className="lp-hero__copy">
          <ul className="lp-badges lp-hero__badges">
            {HERO.badges.map((b, i) => {
              const Icon = BADGE_ICONS[i] ?? Check;
              return (
                <li key={b}>
                  <Icon size={14} /> {b}
                </li>
              );
            })}
          </ul>

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
            <Link href="/" className="lp-cta lp-cta--ink" onClick={() => track("landing_cta", { location: "hero" })}>
              <Camera size={18} /> {HERO.primary}
            </Link>
            <button
              type="button"
              className="lp-cta lp-cta--line"
              onClick={() => {
                track("landing_cta", { location: "hero_try" });
                scrollTo("try");
              }}
            >
              {HERO.secondary}
            </button>
            {/* The hand-drawn arrow from the third reference, looping in at the
                main button. Drawn in on load; only shown where it has room
                beside the buttons. */}
            <svg className="lp-scribble lp-hero__arrow" viewBox="0 0 160 110" aria-hidden="true">
              <path pathLength={1} d="M10 12 C 22 58, 66 24, 60 54 C 55 80, 28 64, 48 54 C 76 40, 104 96, 148 90" />
              <path pathLength={1} d="M134 79 L 150 90 L 136 102" />
            </svg>
          </div>
        </div>

        <div className="lp-stack" aria-hidden="true">
          <span className="lp-stack__glow" />

          <div className="lp-chips">
            {HERO.chips.map((c, i) => (
              <span key={c} className="lp-chip lp-glass" style={{ ["--i" as string]: i }}>
                <span className={`lp-chip__box lp-chip__box--${i}`}>
                  <Check size={13} />
                </span>
                {c}
              </span>
            ))}
          </div>

          <div className="lp-stack__cards">
            {HERO.activity.map((a, i) => {
              const person = i < 2 ? PEOPLE[i] : null;
              return (
                <div key={a.title} className={`lp-act lp-act--${i}`} style={{ ["--i" as string]: i }}>
                  <span
                    className="lp-act__av"
                    style={person ? { background: personColor(person.swatch), color: personInk(person.swatch) } : undefined}
                  >
                    {person ? person.name[0] : <Receipt size={18} />}
                    {i === 0 ? (
                      <span className="lp-act__tick">
                        <Check size={10} />
                      </span>
                    ) : null}
                  </span>
                  <span className="lp-act__text">
                    <span className="lp-act__title">{a.title}</span>
                    <span className="lp-act__meta">{a.meta}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="lp-stat lp-glass">
            <span className="lp-stat__eyebrow">— {HERO.stat.eyebrow}</span>
            <span className="lp-stat__value disp">{HERO.stat.value}</span>
            <span className="lp-stat__sub">{HERO.stat.sub}</span>
          </div>
        </div>

        <div className="lp-trust">
          <span className="lp-trust__label">{HERO.rail}</span>
          {/* Every bank and wallet, running past rather than wrapped into
              rows: two copies end to end, the second hidden from screen
              readers, so the loop is seamless and each name is read once. */}
          <div className="lp-trust__window">
            <div className="lp-trust__track">
              {[0, 1].map((copy) => (
                <ul key={copy} className="lp-trust__logos" aria-hidden={copy === 1 || undefined}>
                  {PAY_BRANDS.map((brand) => (
                    <li key={brand.name}>
                      <img src={brand.src} alt={copy === 0 ? brand.name : ""} decoding="async" />
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
