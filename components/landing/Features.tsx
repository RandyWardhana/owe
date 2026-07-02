import { Camera, Sparkle, Users, Wallet, Share, Lock } from "@/components/icons";
import Reveal from "./Reveal";

const FEATURES = [
  {
    icon: Camera,
    title: "Scan any receipt",
    desc: "Point your camera at the bill. owe pulls out the items and prices so you never type a line.",
  },
  {
    icon: Sparkle,
    title: "Fair splits, instantly",
    desc: "Tax, service and discounts spread across everyone automatically. No mental math, no arguing.",
  },
  {
    icon: Users,
    title: "Tap who had what",
    desc: "Assign each item to one person or split it across a few. Shared plates are handled cleanly.",
  },
  {
    icon: Wallet,
    title: "Get paid back",
    desc: "Attach a bank account or e-wallet — GoPay, OVO, DANA and more — so everyone knows how to pay you.",
  },
  {
    icon: Share,
    title: "Share a clean link",
    desc: "Send one link. Anyone can open the totals and copy each person’s payment details — no app needed.",
  },
  {
    icon: Lock,
    title: "Private & offline",
    desc: "Everything lives on your device and works without a signal. Backups and links are encrypted.",
  },
];

export default function Features() {
  return (
    <section className="lp-section" id="features">
      <div className="lp-wrap">
        <Reveal className="lp-section__head">
          <span className="lp-eyebrow">What you get</span>
          <h2 className="disp lp-h2">Built for the awkward part</h2>
          <p className="lp-lead lp-lead--center">
            From the first snap to the last “paid,” owe covers the whole
            round-of-drinks math so you don’t have to.
          </p>
        </Reveal>

        <div className="lp-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 3) * 70} className="lp-grid__cell">
                <article className="lp-feature card">
                  <span className="lp-feature__icon">
                    <Icon size={22} />
                  </span>
                  <h3 className="lp-feature__title">{f.title}</h3>
                  <p className="lp-feature__desc">{f.desc}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
