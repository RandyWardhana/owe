import type { ReactNode, SVGProps } from "react";

import type { CopyPhase } from "../appearance";
import type { PayMethodKey } from "../payment";

export interface StatusScreenProps {
  icon: ReactNode;
  tone?: "neutral" | "warn";
  title: string;
  body: string;
  actions?: ReactNode;
  children?: ReactNode;
}

export interface StatusLinkProps {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
}

export interface StepsInfo {
  current: number;
  total: number;
}

export interface ScreenProps {
  className?: string;
  title?: ReactNode;
  sub?: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  steps?: StepsInfo;
  footer?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
}

export interface SettingsOptions {
  // Set over a shared bill: money settings mean "show this bill in"; rounding and backups are hidden.
  billCurrency?: string;
  // /landing: only look-and-feel and language, stored in the same settings the app uses.
  appearanceOnly?: boolean;
}

export type SettingsProps = SettingsOptions & { open: boolean; onClose: () => void };

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

export type IconSvgProps = IconProps & { children: ReactNode };

export interface AccountRowProps {
  methodKey: PayMethodKey;
  value: string;
}

export interface AnimatedMoneyProps {
  value: number;
  currency: string;
}

export interface AppIconProps {
  className?: string;
  size?: number;
}

export interface CopyButtonProps {
  text: string;
  label: string;
}

export interface CopyTickProps {
  phase: CopyPhase;
  size?: number;
  icon?: ReactNode;
}

export interface PersonItemsProps {
  items: { name: string; qty: number; share: number; split?: number; units?: number }[];
  currency: string;
}

export interface SparkParticle {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface ProofLightboxProps {
  src: string;
  label: string;
  onClose: () => void;
}

export interface SplashCoverProps {
  leaving: boolean;
}
