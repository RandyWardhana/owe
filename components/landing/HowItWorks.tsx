import Reveal from "./Reveal";
import { HOW_IT_WORKS } from "./data";

export default function HowItWorks() {
  return (
    <section className="lp-section lp-section--alt" id="how">
      <div className="lp-wrap">
        <Reveal className="lp-section__head">
          <span className="lp-eyebrow">How it works</span>
          <h2 className="disp lp-h2">Three taps from bill to settled</h2>
        </Reveal>

        <div className="lp-steps">
          {HOW_IT_WORKS.map((s, i) => (
            <Reveal key={s.num} delay={i * 90} className="lp-steps__cell">
              <div className="lp-step">
                <span className="lp-step__num disp">{s.num}</span>
                <h3 className="lp-step__title">{s.title}</h3>
                <p className="lp-step__desc">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
