"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Receipt, Sparkle, Users } from "@/components/icons";
import { personColor, personInk } from "@/lib/util";

import Money from "./Money";
import { usePlayful, useInView } from "./motion";

const ITEMS = [
  { name: "Tonkotsu ramen", price: 78000, who: [0] },
  { name: "Gyoza (6 pcs)", price: 45000, who: [0, 1] },
  { name: "Karaage", price: 52000, who: [1, 2] },
  { name: "Matcha latte", price: 38000, who: [2] },
];

const PEOPLE = [
  { name: "Aya", swatch: 3 },
  { name: "Ben", swatch: 2 },
  { name: "Cleo", swatch: 1 },
];

const SUBTOTAL = ITEMS.reduce((sum, item) => sum + item.price, 0);
const FEES = Math.round(SUBTOTAL * 0.15);
const TOTAL = SUBTOTAL + FEES;

const shareOf = (person: number) => {
  const base = ITEMS.reduce(
    (sum, item) => (item.who.includes(person) ? sum + item.price / item.who.length : sum),
    0,
  );
  return Math.round(base * (TOTAL / SUBTOTAL));
};

const STAGES = ["Scanning", "Assigning", "Splitting", "Settled"] as const;

/* The hero used to be a still picture of a finished split, which asks people to
   imagine the part that is actually worth seeing. This plays the whole loop --
   scan, assign, split, settle -- on repeat, so the product demonstrates itself
   before anyone taps anything. */
export default function HeroDemo() {
  const play = usePlayful();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!play || !visible) {
      setStage(2);
      return;
    }
    const id = window.setInterval(
      () => setStage((current) => (current + 1) % STAGES.length),
      2400,
    );
    return () => window.clearInterval(id);
  }, [play, visible]);

  const scanning = stage === 0;
  const assigning = stage >= 1;
  const splitting = stage >= 2;
  const settled = stage === 3;

  return (
    <div className="lp-demo" ref={ref}>
      <div className="lp-phone" aria-hidden="true">
        <div className="lp-phone__notch" />
        <div className="lp-phone__screen">
          <div className="lp-demo__bar">
            <span className="lp-demo__chip">
              <Receipt size={13} /> Ramen Ya
            </span>
            <span className={`lp-demo__chip lp-demo__chip--live ${scanning ? "is-on" : ""}`}>
              {STAGES[stage]}
            </span>
          </div>

          <div className={`lp-demo__paper ${scanning ? "is-scanning" : ""}`}>
            {scanning ? <span className="lp-demo__beam" /> : null}

            <ul className="lp-demo__items">
              {ITEMS.map((item, i) => (
                <li
                  key={item.name}
                  className="lp-demo__item"
                  style={{ ["--i" as string]: i }}
                >
                  <span className="lp-demo__name">{item.name}</span>

                  <span className={`lp-demo__who ${assigning ? "is-on" : ""}`}>
                    {item.who.map((p, k) => (
                      <span
                        key={p}
                        className="lp-demo__av"
                        style={{
                          background: personColor(PEOPLE[p].swatch),
                          color: personInk(PEOPLE[p].swatch),
                          ["--k" as string]: k,
                        }}
                      >
                        {PEOPLE[p].name[0]}
                      </span>
                    ))}
                  </span>

                  <span className="lp-demo__price tnum">
                    {item.price.toLocaleString("id-ID")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`lp-demo__split ${splitting ? "is-on" : ""}`}>
            {PEOPLE.map((person, i) => (
              <div key={person.name} className="lp-demo__person" style={{ ["--i" as string]: i }}>
                <span
                  className="lp-demo__av lp-demo__av--lg"
                  style={{ background: personColor(person.swatch), color: personInk(person.swatch) }}
                >
                  {settled ? <Check size={13} /> : person.name[0]}
                </span>
                <span className="lp-demo__pname">{person.name}</span>
                <Money
                  className="lp-demo__amt"
                  value={splitting ? shareOf(i) : 0}
                />
              </div>
            ))}
          </div>

          <div className={`lp-demo__foot ${settled ? "is-done" : ""}`}>
            {settled ? (
              <>
                <Check size={14} /> Everyone paid up
              </>
            ) : (
              <>
                <span className="lp-demo__footlabel">
                  <Sparkle size={13} /> Tax &amp; service included
                </span>
                <Money className="lp-demo__foottotal" value={splitting ? TOTAL : SUBTOTAL} />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="lp-floats">
        <span className="lp-float lp-float--a">
          <Sparkle size={13} /> Fees split evenly
        </span>
        <span className="lp-float lp-float--b">
          <Users size={13} /> 3 people, 4 items
        </span>
      </div>

      <div className="lp-demo__dots" aria-hidden="true">
        {STAGES.map((label, i) => (
          <span key={label} className={`lp-demo__dot ${i === stage ? "is-on" : ""}`} />
        ))}
      </div>
    </div>
  );
}
