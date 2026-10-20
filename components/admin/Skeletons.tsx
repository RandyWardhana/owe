import type { SkeletonProps, SkeletonRowsProps } from "@/entities/props/admin";

const HOLDER_ROWS = 5;
const STAT_TILES = 4;
const BILL_TILES = 6;
const SLIPS = 3;

export function Skeleton({ width = "100%", height = 14, radius = 8, className = "" }: SkeletonProps) {
  return (
    <span
      className={`adm-sk ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function SkeletonRows({ rows }: SkeletonRowsProps) {
  return (
    <div className="adm-sk-rows" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="adm-sk-row">
          <Skeleton width="34%" />
          <Skeleton width="18%" />
          <Skeleton width="12%" />
          <Skeleton width="14%" />
        </div>
      ))}
    </div>
  );
}

export function ConsoleSkeleton() {
  return (
    <div className="adm" aria-busy="true" aria-label="Loading">
      <header className="adm-top">
        <div className="adm-top__in">
          <span className="adm-brand">
            <span className="adm-brand__mark">owe</span>
            <span className="adm-brand__label">Admin</span>
          </span>
          <span className="adm-sk-tabs">
            <Skeleton width={84} height={30} radius={10} />
            <Skeleton width={110} height={30} radius={10} />
            <Skeleton width={96} height={30} radius={10} />
          </span>
          <Skeleton width={78} height={34} radius={12} />
        </div>
      </header>
      <main className="adm-main">
        <section className="adm-hero">
          <div className="adm-sk-stack">
            <Skeleton width={180} height={34} radius={10} />
            <Skeleton width="min(520px, 100%)" />
            <Skeleton width="min(380px, 80%)" />
          </div>
        </section>
        <div className="adm-stats">
          {Array.from({ length: STAT_TILES }).map((_, index) => (
            <div key={index} className="adm-stat adm-sk-stat">
              <Skeleton width={46} height={22} radius={6} />
              <Skeleton width={64} height={11} />
            </div>
          ))}
        </div>
        <Skeleton height={46} radius={12} />
        <section className="adm-holders">
          {Array.from({ length: HOLDER_ROWS }).map((_, index) => (
            <div key={index} className="adm-holder adm-sk-holder" style={{ ["--i" as string]: index }}>
              <Skeleton width={44} height={44} radius={14} />
              <span className="adm-sk-stack">
                <Skeleton width="38%" height={15} />
                <Skeleton width="24%" height={11} />
                <Skeleton width="56%" height={11} />
              </span>
              <span className="adm-sk-stack adm-sk-end">
                <Skeleton width={58} height={15} />
                <Skeleton width={74} height={11} />
              </span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export function BillSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="adm-stack">
      <section className="adm-card adm-billhead">
        <div className="adm-billhead__main adm-sk-stack">
          <Skeleton width={96} height={20} radius={999} />
          <Skeleton width="min(320px, 80%)" height={34} radius={10} />
          <Skeleton width={150} height={12} />
        </div>
        <div className="adm-billhead__actions">
          <Skeleton width={130} height={40} radius={12} />
          <Skeleton width={120} height={40} radius={12} />
          <Skeleton width={140} height={40} radius={12} />
        </div>
      </section>
      <section className="adm-tiles">
        {Array.from({ length: BILL_TILES }).map((_, index) => (
          <div key={index} className="adm-tile adm-sk-stack">
            <Skeleton width={56} height={10} />
            <Skeleton width="70%" height={20} radius={6} />
          </div>
        ))}
      </section>
      <section className="adm-card">
        <Skeleton width={120} height={18} radius={6} />
        <SkeletonRows rows={5} />
      </section>
    </div>
  );
}

export function SlipsSkeleton() {
  return (
    <>
      {Array.from({ length: SLIPS }).map((_, index) => (
        <div key={index} className="rcp-slip adm-sk-slip" aria-hidden="true">
          <span className="adm-sk-stack">
            <Skeleton width="60%" height={18} radius={6} />
            <Skeleton width="44%" height={11} />
          </span>
          <Skeleton height={6} radius={999} />
          <span className="adm-sk-polaroids">
            <Skeleton width={96} height={150} radius={4} />
            <Skeleton width={96} height={150} radius={4} />
            <Skeleton width={96} height={150} radius={4} />
          </span>
        </div>
      ))}
    </>
  );
}
