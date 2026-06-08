"use client";

import { fmtMoney } from "@/lib/currency";
import { useCountUp } from "@/lib/hooks";

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
