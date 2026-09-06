"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { useStore } from "@/lib/store";
import { useMounted, useSharedBill, useAppliedAppearance } from "@/lib/hooks";
import { useBillBackup } from "@/lib/hooks/useBillBackup";
import type { Step } from "@/lib/types";

import Home from "@/components/home/Home";
import Scan from "@/components/Scan";
import Review from "@/components/review/Review";
import People from "@/components/people/People";
import Assign from "@/components/Assign";
import Breakdown from "@/components/breakdown/Breakdown";
import Settings from "@/components/Settings";

const SharedView = dynamic(() => import("@/components/shared/SharedView"), {
  ssr: false,
  loading: () => <div className="shell" />,
});
import Toast from "@/components/Toast";
import ClickSpark from "@/components/ui/ClickSpark";
import InstallPrompt from "@/components/ui/InstallPrompt";
import OfflineBar from "@/components/ui/OfflineBar";

export default function App() {
  const view = useStore((s) => s.view);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const mounted = useMounted();
  const { shared, shareId, clear } = useSharedBill();
  useAppliedAppearance();
  useBillBackup();

  if (!mounted || shared === undefined) {
    return <div className="shell" />;
  }

  if (shared) {
    return (
      <div className="shell">
        <SharedView bill={shared} shareId={shareId} onMakeOwn={clear} />
        <Toast />
        <ClickSpark />
        <InstallPrompt />
        <OfflineBar />
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
    <div className="shell">
      {screens[view] ?? screens.home}
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <Toast />
      <ClickSpark />
      {view === "home" ? <InstallPrompt /> : null}
      <OfflineBar />
    </div>
  );
}
