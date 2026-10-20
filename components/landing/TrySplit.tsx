"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { ArrowRight, Check, Minus, Plus, Sparkle, Trash, Users } from "@/components/icons";
import { personColor, personInk } from "@/lib/util";
import { translate } from "@/lib/i18n";

import Money from "./Money";
import Reveal from "./Reveal";
import { PEOPLE, PRESETS } from "./data";
import { fill, useCopy, useLandingLang } from "./copy";
import { track } from "@/lib/analytics";
import type { TrySplitLine } from "@/entities/props/landing";

const ones = () => PEOPLE.map(() => 1);

const startOf = (preset: number): TrySplitLine[] =>
  PRESETS[preset].items.map((item) => ({
    who: [...item.start],
    units: PEOPLE.map((_, personIndex) => {
      const slot = item.start.indexOf(personIndex);
      return slot >= 0 && item.counts ? item.counts[slot] : 1;
    }),
    each: Boolean(item.counts),
  }));

const qtyOf = (item: { qty?: number }) => Math.max(1, item.qty ?? 1);

/* Count each only means something with several people on a line of several,
   the same rule as Assign: "6x Es teh" where one of them had two. */
const counting = (item: { qty?: number }, line: TrySplitLine) => qtyOf(item) > 1 && line.who.length > 1 && line.each;
const countedOf = (line: TrySplitLine) => line.who.reduce((sum, personIndex) => sum + line.units[personIndex], 0);

export default function TrySplit() {
  const lang = useLandingLang();
  const copy = useCopy();
  const TRY = copy.try;
  // Words the app's Assign step already owns, from its own dictionary.
  const app = (key: string, vars?: Record<string, string | number>) => translate(lang, `assign.${key}`, vars);
  const num = (amount: number) => Math.round(amount).toLocaleString("id-ID");
  const [preset, setPreset] = useState(0);
  const [lines, setLines] = useState<TrySplitLine[]>(() => startOf(0));
  // One "they touched it" event per visit, not one per tap.
  const [tapped, setTapped] = useState(false);
  const demo = (action: string, extra?: Record<string, string | boolean>) =>
    track("landing_demo", { action, preset: PRESETS[preset].id, ...extra });
  const bill = PRESETS[preset];

  const load = (index: number) => {
    setPreset(index);
    setLines(startOf(index));
    track("landing_demo", { action: "preset", preset: PRESETS[index].id });
  };

  const edit = (item: number, change: (line: TrySplitLine) => TrySplitLine) =>
    setLines((current) => current.map((line, i) => (i === item ? change(line) : line)));

  // Taking someone off a line forgets their count, as the app does, so putting
  // them back starts them at one rather than at a stale number.
  const toggle = (item: number, person: number) => {
    if (!tapped) {
      setTapped(true);
      demo("tap_face");
    }
    edit(item, (line) => {
      const on = line.who.includes(person);
      const units = [...line.units];
      units[person] = 1;
      return {
        ...line,
        who: on ? line.who.filter((member) => member !== person) : [...line.who, person].sort(),
        units,
      };
    });
  };

  const setEach = (item: number, each: boolean) => {
    demo("count_each", { on: each });
    edit(item, (line) => ({ ...line, each }));
  };

  // + stops once the whole line is accounted for, for everyone on it, not
  // just at the line's qty per person.
  const step = (item: number, person: number, delta: number) =>
    edit(item, (line) => {
      const qty = qtyOf(bill.items[item]);
      if (delta > 0 && countedOf(line) >= qty) return line;
      const units = [...line.units];
      units[person] = Math.min(qty, Math.max(1, units[person] + delta));
      return { ...line, units };
    });

  const everyone = () => {
    demo("share_all");
    setLines((current) => current.map((line) => ({ ...line, who: PEOPLE.map((_, i) => i), units: ones() })));
  };
  const clear = () => {
    demo("clear");
    setLines(bill.items.map(() => ({ who: [], units: ones(), each: false })));
  };

  const { totals, subtotal, fees, grand, covered } = useMemo(() => {
    const perPerson = PEOPLE.map(() => 0);
    let counted = 0;
    let done = 0;

    bill.items.forEach((item, i) => {
      const line = lines[i];
      if (!line || line.who.length === 0) return;
      done += 1;
      counted += item.price;
      const units = counting(item, line) ? countedOf(line) : line.who.length;
      line.who.forEach((personIndex) => {
        const mine = counting(item, line) ? line.units[personIndex] : 1;
        perPerson[personIndex] += (item.price * mine) / units;
      });
    });

    const feeTotal = counted * (bill.tax + bill.service);
    const scale = counted === 0 ? 0 : (counted + feeTotal) / counted;

    return {
      totals: perPerson.map((amount) => amount * scale),
      subtotal: counted,
      fees: feeTotal,
      grand: counted + feeTotal,
      covered: done,
    };
  }, [lines, bill]);

  const count = bill.items.length;
  const orphans = count - covered;
  const feeLabel = [
    bill.tax ? fill(TRY.tax, { n: Math.round(bill.tax * 100) }) : "",
    bill.service ? fill(TRY.service, { n: Math.round(bill.service * 100) }) : "",
  ]
    .filter(Boolean)
    .join(" + ");

  return (
    <section className="lp-section lp-try" id="try">
      <span className="lp-try__blob" data-parallax="0.12" aria-hidden="true" />
      <div className="lp-wrap">
        <Reveal className="lp-section__head">
          <span className="lp-eyebrow">{TRY.eyebrow}</span>
          <h2 className="disp lp-h2">{TRY.title}</h2>
          <p className="lp-lead lp-lead--center">{TRY.lead}</p>
        </Reveal>

        <Reveal className="lp-presets">
          <span className="lp-presets__label">{TRY.presetsLabel}</span>
          <div className="lp-presets__row" role="radiogroup" aria-label={TRY.presetsLabel}>
            {PRESETS.map((choice, i) => (
              <button
                key={choice.id}
                type="button"
                role="radio"
                aria-checked={i === preset}
                className={`lp-preset ${i === preset ? "is-on" : ""}`}
                onClick={() => load(i)}
              >
                <span className="lp-preset__name">{copy.presets[choice.id]}</span>
                <span className="lp-preset__meta">
                  {choice.items.length} items · {choice.place}
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal className="lp-try__board">
          <div className="lp-try__bill card">
            <div className="lp-try__billhead">
              <span className="lp-try__place">{bill.place}</span>
              <span className="lp-try__hint">
                <Users size={13} /> {TRY.tapFace}
              </span>
            </div>

            <ul className="lp-try__items">
              {bill.items.map((item, i) => {
                const line = lines[i] ?? { who: [], units: ones(), each: false };
                const who = line.who;
                const qty = qtyOf(item);
                const countable = qty > 1 && who.length > 1;
                const isCounting = counting(item, line);
                const counted = countedOf(line);
                const uneven = isCounting && who.some((personIndex) => line.units[personIndex] !== 1);
                return (
                  <li key={`${bill.id}-${item.name}`} className={`lp-try__item ${who.length ? "" : "is-orphan"}`}>
                    <div className="lp-try__itemtop">
                      <span className="lp-try__iname">
                        {item.name}
                        {qty > 1 ? <span className="lp-try__qty"> ×{qty}</span> : null}
                        {who.length > 1 && !isCounting ? (
                          <span className="badge-shared lp-try__badge">{app("shared")}</span>
                        ) : null}
                      </span>
                      <span className="lp-try__iprice tnum">
                        {item.price.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="lp-try__faces">
                      {PEOPLE.map((person, personIndex) => {
                        const on = who.includes(personIndex);
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
                            aria-label={fill(on ? TRY.remove : TRY.add, { name: person.name, item: item.name })}
                            onClick={() => toggle(i, personIndex)}
                          >
                            <span>{person.name[0]}</span>
                            {on ? <Check size={11} className="lp-try__facecheck" /> : null}
                          </button>
                        );
                      })}

                      <span className="lp-try__each tnum">
                        {uneven
                          ? app("perUnit", { amount: num(item.price / counted) })
                          : who.length > 1
                            ? app("each", { amount: num(item.price / who.length) })
                            : who.length === 1
                              ? TRY.allTheirs
                              : TRY.nobodyYet}
                      </span>
                    </div>

                    {/* Mirrors the app's Assign control: same classes and words. */}
                    {countable ? (
                      <div className="units lp-try__units">
                        <div className="seg seg--full units__mode" role="group">
                          <button
                            type="button"
                            className={`seg__btn ${isCounting ? "" : "on"}`}
                            aria-pressed={!isCounting}
                            onClick={() => setEach(i, false)}
                          >
                            {app("modeShared")}
                          </button>
                          <button
                            type="button"
                            className={`seg__btn ${isCounting ? "on" : ""}`}
                            aria-pressed={isCounting}
                            onClick={() => setEach(i, true)}
                          >
                            {app("modeEach")}
                          </button>
                        </div>
                        {isCounting ? (
                          <>
                            <div className="muted units__hint">
                              {app("howMany", { counted, qty })}
                            </div>
                            {who.map((personIndex) => {
                              const unitCount = line.units[personIndex];
                              const name = PEOPLE[personIndex].name;
                              return (
                                <div className="row between units__row" key={name}>
                                  <span className="truncate units__name">{name}</span>
                                  <div className="units__step">
                                    <button
                                      type="button"
                                      className="units__btn"
                                      aria-label={app("less", { name })}
                                      disabled={unitCount <= 1}
                                      onClick={() => step(i, personIndex, -1)}
                                    >
                                      <Minus size={15} />
                                    </button>
                                    <span className="units__n tnum">{unitCount}</span>
                                    <button
                                      type="button"
                                      className="units__btn"
                                      aria-label={app("more", { name })}
                                      disabled={counted >= qty}
                                      onClick={() => step(i, personIndex, 1)}
                                    >
                                      <Plus size={15} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <div className="lp-try__actions">
              <button type="button" className="lp-try__btn" onClick={everyone}>
                <Sparkle size={15} /> {TRY.shareAll}
              </button>
              <button type="button" className="lp-try__btn" onClick={clear}>
                <Trash size={15} /> {TRY.clear}
              </button>
            </div>
          </div>

          <aside className="lp-try__panel card" aria-live="polite">
            <div className="lp-try__count">
              <span className="lp-try__countnum tnum">
                {covered} {TRY.of} {count}
              </span>{" "}
              {TRY.assigned}
              <span className="lp-try__meter" aria-hidden="true">
                <i style={{ transform: `scaleX(${count ? covered / count : 0})` }} />
              </span>
            </div>

            <div className="lp-try__people">
              {PEOPLE.map((person, personIndex) => {
                const amount = totals[personIndex];
                return (
                  <div key={person.name} className={`lp-try__person ${amount ? "" : "is-out"}`}>
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
            </div>

            <div className="lp-try__sums">
              <div className="lp-try__sum">
                <span>{TRY.subtotal}</span>
                <Money value={subtotal} />
              </div>
              {feeLabel ? (
                <div className="lp-try__sum">
                  <span>{feeLabel}</span>
                  <Money value={fees} />
                </div>
              ) : null}
              <div className="lp-try__sum lp-try__sum--grand">
                <span>{TRY.total}</span>
                <Money value={grand} className="disp" />
              </div>
            </div>

            <p className={`lp-try__note ${orphans ? "is-warn" : ""}`}>
              {orphans === 1
                ? TRY.orphansOne
                : orphans
                  ? fill(TRY.orphansMany, { n: orphans })
                  : TRY.covered}
            </p>

            <Link href="/" className="lp-cta lp-cta--ink lp-try__go" onClick={() => track("landing_cta", { location: "demo" })}>
              {TRY.cta} <ArrowRight size={17} className="lp-cta__arrow" />
            </Link>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}
