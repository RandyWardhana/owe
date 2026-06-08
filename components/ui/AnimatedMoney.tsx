"use client";

import { fmtMoney } from "@/lib/currency";
import { useCountUp } from "@/lib/hooks";

/* Money figure that counts up to its value. Drop-in for `fmtMoney(value, cur)`
   inside an existing styled wrapper — renders just the formatted string. */
export default function AnimatedMoney({
  value,
  currency,
}: {
  value: number;
  currency: string;
}) {
  const n = useCountUp(value);
  return <>{fmtMoney(n, currency)}</>;
}
