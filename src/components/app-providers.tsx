"use client";

import { ConfirmProvider } from "@/components/confirm-provider";
import { PageHeaderTitleProvider } from "@/components/page-header-title";
import { ToastProvider } from "@/components/toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PageHeaderTitleProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </PageHeaderTitleProvider>
  );
}
