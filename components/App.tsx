"use client";

import { useState } from "react";

import { useStore } from "@/lib/store";
import { useMounted, useSharedBill, useAppliedAppearance } from "@/lib/hooks";
import type { Step } from "@/lib/types";

import Home from "@/components/home/Home";
import Scan from "@/components/Scan";
import Review from "@/components/review/Review";
import People from "@/components/people/People";
import Assign from "@/components/Assign";
import Breakdown from "@/components/breakdown/Breakdown";
import SharedView from "@/components/shared/SharedView";
import Settings from "@/components/Settings";
import Toast from "@/components/Toast";
import ClickSpark from "@/components/ui/ClickSpark";
import InstallPrompt from "@/components/ui/InstallPrompt";

export default function App() {
  const view = useStore((s) => s.view);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const mounted = useMounted();
  const { shared, clear } = useSharedBill();
  useAppliedAppearance();

  if (!mounted || shared === undefined) {
    return <div className="shell" />;
  }

  if (shared) {
    return (
      <div className="shell">
        <SharedView payload={shared} onMakeOwn={clear} />
        <Toast />
        <ClickSpark />
        <InstallPrompt />
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
      <InstallPrompt />
    </div>
  );
}
