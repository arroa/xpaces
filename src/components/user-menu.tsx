"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

import { AuthLeavingOverlay } from "@/components/auth-leaving-overlay";
import { roleLabel } from "@/lib/roles";

type UserMenuProps = {
  email: string;
  roles: string[];
};

function initialsFromEmail(email: string) {
  const local = email.split("@")[0] ?? "U";
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function UserMenu({ email, roles }: UserMenuProps) {
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onPointerDown);
    }
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    setLeaving(true);
    await fetch("/api/auth/dev-logout", { method: "POST" });
    await new Promise((resolve) => setTimeout(resolve, 1400));
    if (isSignedIn) {
      await signOut({ redirectUrl: "/" });
      return;
    }
    window.location.href = "/";
  }

  return (
    <>
      {leaving && <AuthLeavingOverlay />}
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card-elevated)] text-xs font-semibold text-[var(--besharpx-amber)] ring-2 ring-[var(--besharpx-amber)]/40 transition hover:ring-[var(--besharpx-amber)]/70"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Menú de usuario"
        >
          {initialsFromEmail(email)}
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[#141414] shadow-2xl"
          >
            <div className="border-b border-[var(--border)] px-4 py-3">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">{email}</p>
              <p className="mt-1 text-xs text-[var(--besharpx-amber)]">{roleLabel(roles)}</p>
            </div>
            <div className="p-2">
              <button
                type="button"
                role="menuitem"
                disabled={leaving}
                onClick={() => void handleSignOut()}
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-[var(--muted)] transition hover:bg-[var(--card-elevated)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
