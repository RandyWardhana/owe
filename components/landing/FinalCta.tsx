import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import Reveal from "./Reveal";
import { FINAL_CTA } from "./data";

export default function FinalCta() {
  return (
    <section className="lp-final">
      <div className="lp-wrap">
        <Reveal className="lp-final__inner">
          <h2 className="disp lp-final__title">{FINAL_CTA.title}</h2>
          <p className="lp-final__lead">{FINAL_CTA.lead}</p>
          <Link href="/" className="lp-final__btn">
            {FINAL_CTA.button} <ArrowRight size={20} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
