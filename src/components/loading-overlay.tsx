"use client";

import { createPortal } from "react-dom";

type LoadingOverlayProps = {
  visible: boolean;
  message?: string;
  hint?: string;
};

export function LoadingOverlay({
  visible,
  message = "Procesando…",
  hint,
}: LoadingOverlayProps) {
  if (!visible || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-sm">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--besharpx-amber)]" />
        <p className="mt-6 text-sm font-medium text-[var(--foreground)]">{message}</p>
        {hint && <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p>}
      </div>
    </div>,
    document.body,
  );
}
