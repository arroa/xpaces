import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default function SinAccesoPage() {
  return (
    <div className="card-glass w-full max-w-md rounded-3xl p-8 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Sin acceso</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">No estás en Xpaces</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
        Tu sesión es válida, pero este usuario no está registrado o está inactivo.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <SignOutButton>
          <button type="button" className="btn-amber w-full rounded-xl py-3 text-sm">
            Cerrar sesión
          </button>
        </SignOutButton>
        <Link href="/" className="btn-outline-amber rounded-xl py-3 text-sm font-medium">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
