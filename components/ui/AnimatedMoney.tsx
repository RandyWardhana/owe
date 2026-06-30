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
  const animated = useCountUp(value);
  return <>{fmtMoney(animated, currency)}</>;
}
