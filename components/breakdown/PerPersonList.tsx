"use client";

import { useT } from "@/lib/i18n";
import type { Person, PersonSplit } from "@/lib/types";

import PersonCard from "./PersonCard";

export default function PerPersonList({
  perPerson,
  people,
  payer,
  currency,
}: {
  perPerson: PersonSplit[];
  people: Person[];
  payer: Person | null;
  currency: string;
}) {
  const t = useT();
  const colorOf = (id: string) => people.findIndex((p) => p.id === id);

  const payerSplit = payer ? perPerson.find((p) => p.id === payer.id) : null;
  const others = payer ? perPerson.filter((p) => p.id !== payer.id) : perPerson;

  return (
    <>
      {payerSplit ? (
        <>
          <p className="label" style={{ marginTop: 22 }}>
            {t("breakdown.paidBy")}
          </p>
          <div className="col-gap">
            <PersonCard
              person={payerSplit}
              colorIndex={colorOf(payerSplit.id)}
              animIndex={0}
              payer={payer}
              currency={currency}
              isPayer
            />
          </div>
        </>
      ) : null}

      <p className="label" style={{ marginTop: 22 }}>
        {t("breakdown.perPerson")}
      </p>
      <div className="col-gap stagger">
        {others.map((p, i) => (
          <PersonCard
            key={p.id}
            person={p}
            colorIndex={colorOf(p.id)}
            animIndex={i}
            payer={payer}
            currency={currency}
            isPayer={false}
          />
        ))}
      </div>
    </>
  );
}
