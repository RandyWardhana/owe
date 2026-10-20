"use client";

import { Lock, Sparkle, Wallet, WifiOff } from "@/components/icons";

import Reveal from "./Reveal";
import { useCopy } from "./copy";

const ICONS = [Sparkle, WifiOff, Lock, Wallet];

export default function Perks() {
  const PERKS = useCopy().perks;
  return (
    <section className="lp-section lp-perks" id="why">
      <div className="lp-wrap lp-perks__grid">
        <Reveal className="lp-perks__intro">
          <span className="lp-eyebrow">{PERKS.eyebrow}</span>
          <h2 className="disp lp-h2">{PERKS.title}</h2>
          <p className="lp-lead">{PERKS.lead}</p>
          <dl className="lp-nums">
            {PERKS.stats.map((stat) => (
              <div key={stat.label} className="lp-num">
                <dt className="lp-num__value disp">{stat.value}</dt>
                <dd className="lp-num__label">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <ul className="lp-perks__list">
          {PERKS.items.map((item, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={i} as="li" delay={(i % 2) * 100 + Math.floor(i / 2) * 80} className="lp-perk">
                <span className="lp-perk__icon" aria-hidden="true">
                  <Icon size={17} />
                </span>
                <h3 className="lp-perk__title">{item.title}</h3>
                <p className="lp-perk__desc">{item.desc}</p>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
