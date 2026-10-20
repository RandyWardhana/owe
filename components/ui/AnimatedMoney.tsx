"use client";

import { fmtMoney } from "@/lib/currency";
import { useCountUp } from "@/lib/hooks";
import type { AnimatedMoneyProps } from "@/entities/props/ui";

export default function AnimatedMoney({
  value,
  currency,
}: AnimatedMoneyProps) {
  const animated = useCountUp(value);
  return <>{fmtMoney(animated, currency)}</>;
}
