"use client";

import { useT } from "@/lib/i18n";
import { PAY_METHODS, methodMeta } from "@/lib/payments";
import { buzz, uid } from "@/lib/util";
import type { Account, PayMethodKey, Person } from "@/lib/types";

import { Trash } from "@/components/icons";

export default function PaymentEditor({
  person,
  onChange,
}: {
  person: Person;
  onChange: (accounts: Account[]) => void;
}) {
  const t = useT();
  const accounts = person.accounts;

  const add = (key: PayMethodKey) => {
    buzz(8);
    onChange([...accounts, { id: uid(), key, value: "" }]);
  };
  const set = (id: string, value: string) =>
    onChange(accounts.map((a) => (a.id === id ? { ...a, value } : a)));
  const del = (id: string) => {
    buzz(6);
    onChange(accounts.filter((a) => a.id !== id));
  };

  return (
    <div>
      <p className="muted" style={{ marginTop: 0 }}>
        {t("payment.intro", { name: person.name || "—" })}
      </p>

      {accounts.length ? (
        <div className="col-gap" style={{ marginBottom: 16 }}>
          {accounts.map((account) => {
            const meta = methodMeta(account.key);
            return (
              <div className="acct" key={account.id}>
                <span className="acct__dot" style={{ background: meta.color }} />
                <div className="grow">
                  <div className="acct__label">{meta.label}</div>
                  <input
                    className="acct__in"
                    value={account.value}
                    placeholder={t(`payment.ph.${account.key}`)}
                    onChange={(e) => set(account.id, e.target.value)}
                  />
                </div>
                <button className="iconbtn ghost" aria-label="remove" onClick={() => del(account.id)}>
                  <Trash size={16} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="label">{t("payment.addMethod")}</p>
      <div className="method-grid">
        {PAY_METHODS.map((method) => (
          <button key={method.key} className="chip method-chip" onClick={() => add(method.key)}>
            <span className="acct__dot" style={{ background: method.color }} />
            {method.label}
          </button>
        ))}
      </div>
    </div>
  );
}
