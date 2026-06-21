import Link from "next/link";

export default function OrgSinPlantasPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <section className="card-executive max-w-md rounded-2xl p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--besharpx-amber)]">
          Sin acceso a plantas
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Aún no tienes plantas asignadas</h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
          Tu cuenta está activa, pero el administrador de tu organización no te ha asignado
          ninguna planta para consultar.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Contacta al administrador de tu organización para solicitar acceso.
        </p>
        <Link
          href="/dashboard"
          className="btn-outline-amber mt-8 inline-block rounded-xl px-4 py-2 text-sm font-medium"
        >
          Volver al panel
        </Link>
      </section>
    </div>
  );
}
