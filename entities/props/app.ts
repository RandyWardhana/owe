import type { ReactNode } from "react";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

export interface RootLayoutProps {
  children: ReactNode;
}

export interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export interface AdminBillPageProps {
  params: Promise<{ id: string }>;
}

export interface PwaIconParams {
  params: Promise<{ accent: string; size: string }>;
}

export interface AdminBillRouteParams {
  params: Promise<{ id: string }>;
}

export type SharePageProps = { searchParams: Promise<{ s?: string }> };

export type SharedBillPageProps = { params: Promise<{ id: string }> };

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
