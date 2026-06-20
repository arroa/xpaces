"use client";

type AuthEnteringOverlayProps = {
  message?: string;
};

export function AuthEnteringOverlay({ message = "Entrando a Xpaces…" }: AuthEnteringOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-sm">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--besharpx-amber)]" />
        <p className="mt-6 text-sm font-medium text-[var(--foreground)]">{message}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">Validando tu acceso</p>
      </div>
    </div>
  );
}
