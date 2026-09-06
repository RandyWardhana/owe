import { PAY_BRANDS } from "./payBrands";

/* Each logo sits on a white chip. Most of these marks are dark-on-transparent
   and simply disappear against the dark theme; a chip is also how a real
   checkout renders them, so it reads as intended rather than as a workaround. */
export default function Marquee() {
  return (
    <section className="lp-rail" aria-label="Supported payment methods">
      <div className="lp-rail__track">
        {[0, 1].map((copy) => (
          <div className="lp-rail__run" key={copy} aria-hidden={copy === 1}>
            {PAY_BRANDS.map((brand) => (
              <span className="lp-rail__item" key={`${copy}-${brand.name}`}>
                <img
                  className="lp-rail__logo"
                  src={brand.src}
                  alt={copy === 0 ? brand.name : ""}
                  decoding="async"
                />
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
