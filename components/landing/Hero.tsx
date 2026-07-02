import Link from "next/link";
import { Camera, Check, Sparkle, Receipt } from "@/components/icons";
import { HERO } from "./data";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Hero() {
  return (
    <header className="lp-hero">
      <div className="lp-wrap lp-hero__inner">
        <div className="lp-hero__copy">
          <span className="lp-eyebrow">{HERO.eyebrow}</span>
          <h1 className="disp lp-hero__title">
            {HERO.title.map((line, i) => (
              <span key={i}>
                {line}
                {i < HERO.title.length - 1 ? <br /> : null}
              </span>
            ))}
          </h1>
          <p className="lp-lead">{HERO.lead}</p>

          <div className="lp-hero__cta">
            <Link href="/" className="btn lp-btn">
              <Camera size={20} /> {HERO.primary}
            </Link>
            <button
              type="button"
              className="btn secondary lp-btn"
              onClick={() => scrollTo("how")}
            >
              {HERO.secondary}
            </button>
          </div>

          <ul className="lp-checks">
            {HERO.checks.map((c) => (
              <li key={c}>
                <span className="lp-check">
                  <Check size={13} />
                </span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* On-brand mock of a finished split */}
        <div className="lp-hero__art" aria-hidden="true">
          <div className="lp-mock card">
            <div className="lp-mock__head">
              <div>
                <div className="lp-mock__label">Total bill</div>
                <div className="lp-mock__total disp tnum">Rp 428.000</div>
              </div>
              <div className="lp-mock__chip">
                <Receipt size={15} /> 8 items
              </div>
            </div>

            <div className="lp-mock__rows">
              {[
                { n: "Aya", a: "Rp 142.000", c: "var(--p4)" },
                { n: "Ben", a: "Rp 118.500", c: "var(--p3)" },
                { n: "Cleo", a: "Rp 167.500", c: "var(--p2)" },
              ].map((p) => (
                <div key={p.n} className="lp-mock__row">
                  <span
                    className="avatar lp-mock__av"
                    style={{ background: p.c }}
                  >
                    {p.n[0]}
                  </span>
                  <span className="grow lp-mock__name">{p.n}</span>
                  <span className="tnum lp-mock__amt">{p.a}</span>
                </div>
              ))}
            </div>

            <div className="lp-mock__foot">
              <Check size={15} /> Everyone paid up
            </div>
          </div>

          <span className="lp-float lp-float--a">
            <Sparkle size={14} /> Tax split evenly
          </span>
          <span className="lp-float lp-float--b">
            <Check size={14} /> Scanned in 2s
          </span>
        </div>
      </div>
    </header>
  );
}
