"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";

export type ConfirmOptions = {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type DialogState = {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    setDialog(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts = typeof options === "string" ? { message: options } : options;

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialog({
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? "Aplicar",
        cancelLabel: opts.cancelLabel ?? "Cancelar",
        destructive: opts.destructive ?? true,
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        open={Boolean(dialog)}
        message={dialog?.message ?? ""}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        destructive={dialog?.destructive}
        onConfirm={() => close(true)}
        onCancel={() => close(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm debe usarse dentro de ConfirmProvider");
  }
  return context.confirm;
}
