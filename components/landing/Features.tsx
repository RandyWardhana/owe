"use client";

import { useState } from "react";

import { Camera, Check, Copy, Lock, Sparkle, Users, Wallet, WifiOff } from "@/components/icons";

import Reveal from "./Reveal";

function ScanArt() {
  return (
    <div className="lp-art lp-art--scan" aria-hidden="true">
      <span className="lp-art__beam" />
      {[64, 44, 72, 38, 56].map((w, i) => (
        <span key={i} className="lp-art__line" style={{ width: `${w}%`, ["--i" as string]: i }} />
      ))}
    </div>
  );
}

function LinkArt() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={`lp-art lp-art--link ${copied ? "is-copied" : ""}`}
      onClick={() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
      aria-label="Preview copying a share link"
    >
      <span className="lp-art__url tnum">owe.my.id/s/owe-8k2p1a</span>
      <span className="lp-art__copy">
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

function PrivacyArt() {
  return (
    <div className="lp-art lp-art--safe" aria-hidden="true">
      <span className="lp-art__orb">
        <Lock size={20} />
      </span>
      <span className="lp-art__pulse" />
      <span className="lp-art__off">
        <WifiOff size={13} /> still works
      </span>
    </div>
  );
}

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

        <div className="lp-bento">
          <Reveal className="lp-bento__cell lp-bento__cell--wide">
            <article className="lp-card card">
              <ScanArt />
              <span className="lp-card__icon">
                <Camera size={20} />
              </span>
              <h3 className="lp-card__title">Scan any receipt</h3>
              <p className="lp-card__desc">
                Point your camera at the bill. owe pulls out the items and prices
                so you never type a line.
              </p>
            </article>
          </Reveal>

          <Reveal delay={70} className="lp-bento__cell lp-bento__cell--tall">
            <article className="lp-card card">
              <PrivacyArt />
              <span className="lp-card__icon">
                <Lock size={20} />
              </span>
              <h3 className="lp-card__title">Private &amp; offline</h3>
              <p className="lp-card__desc">
                Everything lives on your device and works without a signal.
                Backups and links are encrypted end to end.
              </p>
            </article>
          </Reveal>

          <Reveal delay={140} className="lp-bento__cell">
            <article className="lp-card card">
              <span className="lp-card__icon">
                <Sparkle size={20} />
              </span>
              <h3 className="lp-card__title">Fair splits, instantly</h3>
              <p className="lp-card__desc">
                Tax, service and discounts spread across everyone automatically.
              </p>
            </article>
          </Reveal>

          <Reveal delay={70} className="lp-bento__cell">
            <article className="lp-card card">
              <span className="lp-card__icon">
                <Users size={20} />
              </span>
              <h3 className="lp-card__title">Shared plates, handled</h3>
              <p className="lp-card__desc">
                Assign an item to one person or split it across a few. The fees
                follow the split.
              </p>
            </article>
          </Reveal>

          <Reveal delay={140} className="lp-bento__cell">
            <article className="lp-card card">
              <span className="lp-card__icon">
                <Wallet size={20} />
              </span>
              <h3 className="lp-card__title">Get paid back</h3>
              <p className="lp-card__desc">
                Attach a bank account or e-wallet so everyone knows exactly how
                to pay you.
              </p>
            </article>
          </Reveal>

          <Reveal delay={70} className="lp-bento__cell lp-bento__cell--wide">
            <article className="lp-card card">
              <span className="lp-card__icon">
                <Copy size={20} />
              </span>
              <h3 className="lp-card__title">Share a clean link</h3>
              <p className="lp-card__desc">
                Send one link. Anyone can open the totals and copy each person’s
                payment details — no app needed.
              </p>
              <LinkArt />
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
