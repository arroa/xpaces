import Link from "next/link";

import type { ViewerAccessibleFloor } from "@/lib/viewer-floor-access";

type ViewerFloorsListProps = {
  floors: ViewerAccessibleFloor[];
  organizationName?: string;
};

export function ViewerFloorsList({ floors, organizationName }: ViewerFloorsListProps) {
  return (
    <div className="space-y-6">
      <section>
        {organizationName && (
          <p className="text-sm font-medium text-[var(--besharpx-amber)]">{organizationName}</p>
        )}
        <h1 className="mt-1 text-2xl font-bold">Mis plantas</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Plantas asignadas para consulta. Selecciona una para ver el layout.
        </p>
      </section>

      <section className="card-executive overflow-hidden rounded-2xl">
        <div className="border-b border-[var(--border-strong)] px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--besharpx-amber)]">
            Lista
            {floors.length > 0 && (
              <span className="ml-2 font-normal normal-case text-[var(--muted)]">
                ({floors.length})
              </span>
            )}
          </h2>
        </div>

        {floors.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
            No tienes plantas asignadas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-strong)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-2.5 font-medium">Edificio</th>
                  <th className="px-4 py-2.5 font-medium">Planta</th>
                  <th className="px-4 py-2.5 font-medium">Puestos</th>
                  <th className="px-4 py-2.5 font-medium">Salas</th>
                  <th className="px-4 py-2.5 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {floors.map((floor) => (
                  <tr key={floor.id} className="hover:bg-[var(--field)]/50">
                    <td className="px-4 py-2.5">{floor.buildingName}</td>
                    <td className="px-4 py-2.5 font-medium">{floor.name}</td>
                    <td className="px-4 py-2.5 text-[var(--muted)]">{floor.totalSeats}</td>
                    <td className="px-4 py-2.5 text-[var(--muted)]">{floor.totalRooms}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/org/floors/${floor.id}/layout`}
                        className="btn-outline-amber inline-block rounded-lg px-2.5 py-1 text-xs"
                      >
                        Ver planta
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
