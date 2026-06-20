"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type PageHeaderTitleContextValue = {
  title: string | null;
  setTitle: (title: string | null) => void;
};

const PageHeaderTitleContext = createContext<PageHeaderTitleContextValue | null>(null);

export function PageHeaderTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  const value = useMemo(() => ({ title, setTitle }), [title]);

  return (
    <PageHeaderTitleContext.Provider value={value}>{children}</PageHeaderTitleContext.Provider>
  );
}

export function usePageHeaderTitle(title?: string | null) {
  const context = useContext(PageHeaderTitleContext);
  if (!context) {
    throw new Error("usePageHeaderTitle must be used within PageHeaderTitleProvider");
  }

  useEffect(() => {
    if (title === undefined) {
      return;
    }
    context.setTitle(title);
    return () => context.setTitle(null);
  }, [context, title]);

  return context;
}

export function usePageHeaderTitleValue() {
  const context = useContext(PageHeaderTitleContext);
  return context?.title ?? null;
}
