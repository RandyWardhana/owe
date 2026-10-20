"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useMounted, useSharedBill, useAppliedAppearance, useSplash } from "@/lib/hooks";
import { useBillBackup } from "@/lib/hooks/useBillBackup";
import type { Step } from "@/entities/bill";

import Home from "@/components/home/Home";
import Scan from "@/components/Scan";
import Review from "@/components/review/Review";
import People from "@/components/people/People";
import Assign from "@/components/Assign";
import Breakdown from "@/components/breakdown/Breakdown";
import Settings from "@/components/Settings";
import SharedMissing from "@/components/shared/SharedMissing";
import Sidebar from "@/components/desk/Sidebar";
import LiveReceipt from "@/components/desk/LiveReceipt";
import Toast from "@/components/Toast";
import InstallPrompt from "@/components/ui/InstallPrompt";
import OfflineBar from "@/components/ui/OfflineBar";
import SplashCover from "@/components/ui/Splash";

const SharedView = dynamic(() => import("@/components/shared/SharedView"), {
  ssr: false,
  loading: () => null,
});

export default function App() {
  const view = useStore((s) => s.view);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const t = useT();
  const mounted = useMounted();
  const { shared, shareId, missing, clear } = useSharedBill();
  useAppliedAppearance();
  useBillBackup();
  const splash = useSplash();

  // Keyed so the same cover survives the switch from loading to the real shell: its animation
  // keeps running instead of restarting, and it fades out over whatever loaded underneath.
  const cover = splash === "gone" ? null : <SplashCover key="splash" leaving={splash === "leaving"} />;

  if (!mounted || shared === undefined) {
    return <div className="shell shell--splash">{cover}</div>;
  }

  if (shared) {
    return (
      <div className="shell workspace workspace--shared">
        <SharedView bill={shared} shareId={shareId} onMakeOwn={clear} />
        <Toast />
        <InstallPrompt />
        <OfflineBar />
        {cover}
      </div>
    );
  }

  if (missing) {
    return (
      <div className="shell shell--page">
        <SharedMissing reason={missing} onMakeOwn={clear} />
        <OfflineBar />
        {cover}
      </div>
    );
  }

  const screens: Record<Step, React.ReactNode> = {
    home: <Home onOpenSettings={() => setSettingsOpen(true)} />,
    scan: <Scan />,
    review: <Review />,
    people: <People />,
    assign: <Assign />,
    breakdown: <Breakdown />,
  };

  return (
    <div className="shell workspace">
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />
      <main className="ws-main">{screens[view] ?? screens.home}</main>
      <aside className="ws-receipt" aria-label={t("desk.receipt.column")}>
        <LiveReceipt />
      </aside>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toast />
      {view === "home" ? <InstallPrompt /> : null}
      <OfflineBar />
      {cover}
    </div>
  );
}
