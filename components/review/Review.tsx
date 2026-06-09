"use client";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { fmtMoney, CURRENCIES } from "@/lib/currency";
import { computeSplit, lineTotal } from "@/lib/calc";
import { buzz, uid, clampNum } from "@/lib/util";
import type { ChargeMode, Item } from "@/lib/types";

import Screen from "@/components/Screen";
import { Plus, Trash, ArrowRight } from "@/components/icons";
import ChargeRow from "./ChargeRow";
import QtyInput from "./QtyInput";

export default function Review() {
  const t = useT();
  const currency = useStore((s) => s.currency);
  const rounding = useStore((s) => s.rounding);
  const draft = useStore((s) => s.draft);
  const updateDraft = useStore((s) => s.updateDraft);
  const patchDraft = useStore((s) => s.patchDraft);
  const go = useStore((s) => s.go);

  const sym = (CURRENCIES[currency] || CURRENCIES.USD).sym;
  const split = computeSplit(draft, { rounding });

  const setItem = (id: string, patch: Partial<Item>) =>
    updateDraft((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));

  const delItem = (id: string) => {
    buzz(6);
    updateDraft((d) => ({ ...d, items: d.items.filter((it) => it.id !== id) }));
  };

  const addItem = () => {
    buzz(8);
    updateDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        { id: uid(), name: "", qty: 1, price: 0, assignedTo: [], _new: true },
      ],
    }));
  };

  const setCharge = (
    key: "taxPct" | "servicePct" | "discount" | "taxMode" | "serviceMode",
    v: number | ChargeMode,
  ) => updateDraft((d) => ({ ...d, charges: { ...d.charges, [key]: v } }));

  const banner =
    draft.source === "demo"
      ? t("review.bannerDemo")
      : draft.source === "ocr" || draft.source === "partial"
        ? t("review.bannerOcr")
        : "";

  return (
    <Screen
      title={t("review.title")}
      sub={t("review.sub")}
      steps={{ current: 1, total: 4 }}
      footer={
        <button
          className="btn"
          disabled={split.itemsSubtotal <= 0}
          onClick={() => {
            buzz(8);
            go("people");
          }}
        >
          {t("review.next")} <ArrowRight size={20} />
        </button>
      }
    >
      <div className="pad">
        <input
          className="field title-field disp"
          value={draft.title}
          placeholder={t("review.titleNew")}
          onChange={(e) => patchDraft({ title: e.target.value })}
        />

        {banner ? <div className="banner">{banner}</div> : null}

        <div className="col-gap stagger" style={{ marginTop: 14 }}>
          {draft.items.map((it, i) => (
            <div
              className={`card item ${it._new ? "pop" : ""}`}
              key={it.id}
              style={{ ["--i" as string]: i }}
            >
              <input
                className="item__name"
                value={it.name}
                placeholder={t("review.itemName")}
                onChange={(e) => setItem(it.id, { name: e.target.value })}
              />
              <button
                className="iconbtn ghost item__del"
                aria-label="delete"
                onClick={() => delItem(it.id)}
              >
                <Trash size={18} />
              </button>
              <div className="item__nums">
                <label className="qtybox">
                  <span className="qtybox__x">×</span>
                  <QtyInput
                    value={it.qty}
                    onChange={(n) => setItem(it.id, { qty: n })}
                  />
                </label>
                <label className="pricebox">
                  <span className="muted">{t("review.each")}</span>
                  <input
                    className="pricebox__in tnum"
                    inputMode="decimal"
                    value={it.price || ""}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setItem(it.id, { price: clampNum(e.target.value) })}
                  />
                </label>
                <div className="item__line disp tnum">{fmtMoney(lineTotal(it), currency)}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn secondary" style={{ marginTop: 12 }} onClick={addItem}>
          <Plus size={18} /> {t("review.addItem")}
        </button>

        <p className="label" style={{ marginTop: 26 }}>
          {t("review.charges")}
        </p>
        <div className="card charges">
          <ChargeRow
            label={t("review.tax")}
            sym={sym}
            mode={draft.charges.taxMode || "pct"}
            onModeChange={(m) => setCharge("taxMode", m)}
            value={draft.charges.taxPct}
            onChange={(v) => setCharge("taxPct", v)}
          />
          <hr className="hr" />
          <ChargeRow
            label={t("review.service")}
            sym={sym}
            mode={draft.charges.serviceMode || "pct"}
            onModeChange={(m) => setCharge("serviceMode", m)}
            value={draft.charges.servicePct}
            onChange={(v) => setCharge("servicePct", v)}
          />
          <hr className="hr" />
          <ChargeRow
            label={t("review.discount")}
            prefix={sym}
            value={draft.charges.discount}
            onChange={(v) => setCharge("discount", v)}
          />
        </div>

        <div className="card totals" style={{ marginTop: 14 }}>
          <div className="row between totals__row">
            <span className="muted">{t("review.subtotal")}</span>
            <span className="tnum">{fmtMoney(split.itemsSubtotal, currency)}</span>
          </div>
          <div className="row between totals__row totals__grand">
            <span className="disp">{t("review.total")}</span>
            <span className="disp tnum">{fmtMoney(split.grandTotal, currency)}</span>
          </div>
        </div>
      </div>
    </Screen>
  );
}
