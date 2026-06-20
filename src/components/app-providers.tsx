"use client";

import { ConfirmProvider } from "@/components/confirm-provider";
import { PageHeaderTitleProvider } from "@/components/page-header-title";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PageHeaderTitleProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </PageHeaderTitleProvider>
  );
}
