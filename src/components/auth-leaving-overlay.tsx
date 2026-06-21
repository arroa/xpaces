"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function AuthLeavingOverlay() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="farewell-backdrop fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="farewell-title"
    >
      <div className="farewell-modal rounded-2xl border-2 border-[var(--besharpx-amber)] bg-[#161616]">
        <div className="farewell-modal-body">
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <h2
              id="farewell-title"
              className="farewell-modal-title text-[clamp(1.75rem,5vw,2.75rem)] font-bold leading-tight tracking-tight text-white"
            >
              Hasta pronto
            </h2>
            <p className="farewell-modal-sub text-[clamp(0.95rem,2.5vw,1.25rem)] font-medium text-[var(--foreground)]/85">
              Cerrando sesión en Xpaces…
            </p>
            <div className="farewell-modal-sub h-10 w-10 animate-spin rounded-full border-[3px] border-[#333] border-t-[var(--besharpx-amber)]" />
          </div>
          <p className="pb-1 text-[0.65rem] font-bold uppercase tracking-[0.3em] text-[var(--besharpx-amber)]/80 sm:text-xs">
            BeSharpX
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
