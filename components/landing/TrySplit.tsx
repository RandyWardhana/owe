"use client";

import { useMemo, useState } from "react";

import { Check, Sparkle, Users } from "@/components/icons";
import { personColor, personInk } from "@/lib/util";

import Money from "./Money";
import Reveal from "./Reveal";

const PEOPLE = [
  { name: "Aya", swatch: 3 },
  { name: "Ben", swatch: 2 },
  { name: "Cleo", swatch: 1 },
  { name: "Dee", swatch: 5 },
];

const ITEMS = [
  { name: "Tonkotsu ramen", price: 78000, start: [0] },
  { name: "Gyoza (6 pcs)", price: 45000, start: [0, 1] },
  { name: "Karaage", price: 52000, start: [1, 2] },
  { name: "Matcha latte", price: 38000, start: [2] },
  { name: "Mochi, 4 pcs", price: 36000, start: [0, 1, 2, 3] },
];

const TAX = 0.1;
const SERVICE = 0.05;

/* The one section that is not a claim about the product.
   Splitting a bill sounds simple until a plate is shared four ways and the tax
   has to follow it; letting people tap that themselves lands the point faster
   than any sentence about "fair splits". */
export default function TrySplit() {
  const [assigned, setAssigned] = useState<number[][]>(() => ITEMS.map((i) => [...i.start]));

  const toggle = (item: number, person: number) =>
    setAssigned((current) =>
      current.map((who, i) => {
        if (i !== item) return who;
        return who.includes(person) ? who.filter((p) => p !== person) : [...who, person].sort();
      }),
    );

  const everyone = () => setAssigned(ITEMS.map(() => PEOPLE.map((_, i) => i)));
  const reset = () => setAssigned(ITEMS.map((i) => [...i.start]));

  const { totals, subtotal, fees, grand, orphans } = useMemo(() => {
    const perPerson = PEOPLE.map(() => 0);
    let counted = 0;
    let unassigned = 0;

    ITEMS.forEach((item, i) => {
      const who = assigned[i];
      if (who.length === 0) {
        unassigned += 1;
        return;
      }
      counted += item.price;
      who.forEach((p) => {
        perPerson[p] += item.price / who.length;
      });
    });

    const feeTotal = counted * (TAX + SERVICE);
    const scale = counted === 0 ? 0 : (counted + feeTotal) / counted;

    return {
      totals: perPerson.map((amount) => amount * scale),
      subtotal: counted,
      fees: feeTotal,
      grand: counted + feeTotal,
      orphans: unassigned,
    };
  }, [assigned]);

  return (
    <section className="lp-section lp-try" id="try">
      <div className="lp-wrap">
        <Reveal className="lp-section__head">
          <span className="lp-eyebrow">Have a go</span>
          <h2 className="disp lp-h2">Tap who had what</h2>
          <p className="lp-lead lp-lead--center">
            This is the real thing, not a picture of it. Tap a face to put someone
            on a dish — everything below recalculates, tax and service included.
          </p>
        </Reveal>

        <Reveal className="lp-try__board">
          <div className="lp-try__bill card">
            <div className="lp-try__billhead">
              <span className="lp-try__place">Ramen Ya</span>
              <span className="lp-try__hint">
                <Users size={13} /> tap a face
              </span>
            </div>

            <ul className="lp-try__items">
              {ITEMS.map((item, i) => {
                const who = assigned[i];
                return (
                  <li key={item.name} className={`lp-try__item ${who.length ? "" : "is-orphan"}`}>
                    <div className="lp-try__itemtop">
                      <span className="lp-try__iname">{item.name}</span>
                      <span className="lp-try__iprice tnum">
                        {item.price.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="lp-try__faces">
                      {PEOPLE.map((person, p) => {
                        const on = who.includes(p);
                        return (
                          <button
                            key={person.name}
                            type="button"
                            className={`lp-try__face ${on ? "is-on" : ""}`}
                            style={{
                              ["--tint" as string]: personColor(person.swatch),
                              ["--tint-ink" as string]: personInk(person.swatch),
                            }}
                            aria-pressed={on}
                            aria-label={`${on ? "Remove" : "Add"} ${person.name} ${on ? "from" : "to"} ${item.name}`}
                            onClick={() => toggle(i, p)}
                          >
                            <span>{person.name[0]}</span>
                            {on ? <Check size={11} className="lp-try__facecheck" /> : null}
                          </button>
                        );
                      })}

                      <span className="lp-try__each tnum">
                        {who.length > 1
                          ? `${Math.round(item.price / who.length).toLocaleString("id-ID")} each`
                          : who.length === 1
                            ? "all theirs"
                            : "nobody yet"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="lp-try__sums">
              <div className="lp-try__sum">
                <span>Subtotal</span>
                <Money value={subtotal} />
              </div>
              <div className="lp-try__sum">
                <span>Tax 10% + service 5%</span>
                <Money value={fees} />
              </div>
              <div className="lp-try__sum lp-try__sum--grand">
                <span>Total</span>
                <Money value={grand} className="disp" />
              </div>
            </div>

            <div className="lp-try__actions">
              <button type="button" className="lp-try__btn" onClick={everyone}>
                <Sparkle size={15} /> Share everything
              </button>
              <button type="button" className="lp-try__btn" onClick={reset}>
                Start over
              </button>
            </div>
          </div>

          <div className="lp-try__people">
            {PEOPLE.map((person, p) => {
              const amount = totals[p];
              return (
                <div key={person.name} className={`lp-try__person card ${amount ? "" : "is-out"}`}>
                  <span
                    className="lp-try__pav"
                    style={{
                      background: personColor(person.swatch),
                      color: personInk(person.swatch),
                    }}
                  >
                    {person.name[0]}
                  </span>
                  <span className="lp-try__pname">{person.name}</span>
                  <Money value={amount} className="lp-try__pamt disp" />
                </div>
              );
            })}

            <p className={`lp-try__note ${orphans ? "is-warn" : ""}`}>
              {orphans
                ? `${orphans} ${orphans === 1 ? "item has" : "items have"} nobody on ${orphans === 1 ? "it" : "them"} — nobody is charged for ${orphans === 1 ? "it" : "them"}.`
                : "Every item is covered. This is what everyone gets sent."}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
