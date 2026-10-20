"use client";

import { useEffect, useState } from "react";

/* Honours both owe's own animation switch (data-anim="off") and the OS setting. */
export function usePlayful(): boolean {
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () =>
      setPlay(!query.matches && document.documentElement.dataset.anim !== "off");

    decide();
    query.addEventListener("change", decide);

    const watch = new MutationObserver(decide);
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-anim"] });

    return () => {
      query.removeEventListener("change", decide);
      watch.disconnect();
    };
  }, []);

  return play;
}

export function useInView<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  rootMargin = "0px 0px -10% 0px",
): boolean {
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.2, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, seen]);

  return seen;
}
