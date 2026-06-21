"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const DEFAULT_TOAST_DURATION_MS = 2000;

export type ToastVariant = "success" | "error";

export type ToastOptions = {
  durationMs?: number;
  variant?: ToastVariant;
};

type ToastState = {
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastBanner({ toast }: { toast: ToastState }) {
  const isSuccess = toast.variant === "success";

  return (
    <div
      className={`toast-banner rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
        isSuccess
          ? "border-[var(--besharpx-amber)]/40 bg-[#1a1a1a] text-[var(--besharpx-amber)]"
          : "border-red-500/40 bg-[#1a1a1a] text-red-300"
      }`}
    >
      {toast.message}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    const durationMs = options.durationMs ?? DEFAULT_TOAST_DURATION_MS;
    const variant = options.variant ?? "success";

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast({ message, variant });
    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, durationMs);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted &&
        toast &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 top-20 z-[180] flex justify-center px-4"
            role="status"
            aria-live="polite"
          >
            <ToastBanner toast={toast} />
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}
