"use client";

import { useT } from "@/lib/i18n";

import PersonCard from "./PersonCard";
import type { PerPersonListProps } from "@/entities/props/breakdown";

export default function PerPersonList({
  perPerson,
  people,
  payer,
  currency,
}: PerPersonListProps) {
  const t = useT();
  const colorOf = (id: string) => people.findIndex((person) => person.id === id);

  const payerSplit = payer ? perPerson.find((split) => split.id === payer.id) : null;
  const others = payer ? perPerson.filter((split) => split.id !== payer.id) : perPerson;

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
        {others.map((split, i) => (
          <PersonCard
            key={split.id}
            person={split}
            colorIndex={colorOf(split.id)}
            animIndex={i}
            currency={currency}
            isPayer={false}
          />
        ))}
      </div>
    </>
  );
}
