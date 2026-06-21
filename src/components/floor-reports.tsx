"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { LoadingOverlay } from "@/components/loading-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { exportFloorReportPdf } from "@/lib/export-floor-report-pdf";
import type { FloorLayoutData } from "@/lib/floor-layout-data";
import type { FloorReportBuildingGroup, FloorReportOption } from "@/lib/floor-report-options";
import { isSeatPlanted } from "@/lib/floor-report-stats";
import { withOrgContext } from "@/lib/org-api-client";

type FloorReportsProps = {
  organizationId?: string;
  organizationName?: string;
  backHref?: string;
};

export function FloorReports({ organizationId, organizationName, backHref }: FloorReportsProps) {
  const [buildings, setBuildings] = useState<FloorReportBuildingGroup[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [generatingFloorId, setGeneratingFloorId] = useState("");
  const [error, setError] = useState("");

  const loadReports = useCallback(async () => {
    setError("");
    setInitialLoading(true);
    try {
      const res = await fetch("/api/reports/floors", withOrgContext(organizationId));
      const data = (await res.json()) as {
        buildings?: FloorReportBuildingGroup[];
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar el informe");
        setBuildings([]);
        return;
      }

      setBuildings(data.buildings ?? []);
    } finally {
      setInitialLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function handleGenerate(floorId: string) {
    if (generatingFloorId) {
      return;
    }

    setGeneratingFloorId(floorId);
    setError("");
    try {
      const res = await fetch(`/api/floors/${floorId}/layout`, withOrgContext(organizationId));
      const data = (await res.json()) as FloorLayoutData & { error?: string };

      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar la planta");
        return;
      }

      if (!data.floor.imageUrl?.trim()) {
        setError("Esta planta no tiene plano cargado.");
        return;
      }

      if (!data.seats.some(isSeatPlanted)) {
        setError("Esta planta no tiene puestos colocados en el plano.");
        return;
      }

      await exportFloorReportPdf(data);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo generar el informe";
      setError(message);
    } finally {
      setGeneratingFloorId("");
    }
  }

  if (initialLoading) {
    return <FloorReportsSkeleton />;
  }

  const hasFloors = buildings.some((building) => building.floors.length > 0);

  return (
    <div className="space-y-6">
      <LoadingOverlay visible={Boolean(generatingFloorId)} message="Generando informe PDF…" />

      <section>
        {backHref && (
          <Link
            href={backHref}
            className="text-sm text-[var(--muted)] transition hover:text-[var(--besharpx-amber)]"
          >
            ← Volver
          </Link>
        )}
        {organizationName && (
          <p className={`section-kicker ${backHref ? "mt-4" : ""}`}>{organizationName}</p>
        )}
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Informe</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Genera un PDF por planta con plano, estadísticas y puestos utilizados.
        </p>
      </section>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {!hasFloors ? (
        <section className="card-executive rounded-2xl p-5">
          <p className="text-sm text-[var(--muted)]">No hay plantas activas en esta organización.</p>
        </section>
      ) : (
        buildings.map((building) =>
          building.floors.length === 0 ? null : (
            <section key={building.id} className="card-executive overflow-hidden rounded-2xl">
              <div className="border-b border-[var(--border-strong)] px-4 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--besharpx-amber)]">
                  {building.name}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-[var(--border-strong)] text-xs uppercase tracking-wide text-[var(--muted)]">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Planta</th>
                      <th className="px-4 py-2.5 font-medium">Puestos</th>
                      <th className="px-4 py-2.5 font-medium">En plano</th>
                      <th className="px-4 py-2.5 font-medium">Utilizados</th>
                      <th className="px-4 py-2.5 font-medium">Salas</th>
                      <th className="px-4 py-2.5 text-right font-medium">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {building.floors.map((floor) => (
                      <tr key={floor.id} className="hover:bg-[var(--field)]/50">
                        <td className="px-4 py-2.5 font-medium">{floor.name}</td>
                        <td className="px-4 py-2.5 text-[var(--muted)]">{floor.totalSeats}</td>
                        <td className="px-4 py-2.5 text-[var(--muted)]">
                          {floor.plantedSeats}/{floor.totalSeats}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--muted)]">{floor.utilizedSeats}</td>
                        <td className="px-4 py-2.5 text-[var(--muted)]">
                          {floor.plantedRooms}/{floor.totalRooms}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => void handleGenerate(floor.id)}
                            disabled={!floor.canGenerate || Boolean(generatingFloorId)}
                            className="btn-outline-amber rounded-lg px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                            title={floorGenerateHint(floor)}
                          >
                            Generar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ),
        )
      )}
    </div>
  );
}

function floorGenerateHint(floor: FloorReportOption) {
  if (!floor.imageUrl.trim()) {
    return "Sube un plano para generar el informe";
  }
  if (floor.plantedSeats === 0) {
    return "Coloca puestos en el plano para generar el informe";
  }
  return "Generar informe PDF";
}

function FloorReportsSkeleton() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </section>
      <section className="card-executive overflow-hidden rounded-2xl">
        <div className="border-b border-[var(--border-strong)] px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
