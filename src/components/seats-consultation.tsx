"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { LoadingLink } from "@/components/loading-link";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { withOrgContext } from "@/lib/org-api-client";
import {
  filterSeatRows,
  type SeatSearchOptions,
  type SeatSearchRow,
} from "@/lib/seat-consultation-shared";

type SeatsConsultationProps = {
  organizationId?: string;
  organizationName?: string;
  layoutBasePath: string;
  backHref?: string;
};

type SortKey = "floorName" | "puesto" | "estado" | "grupo" | "equipo" | "persona" | "empresa";
type SortDir = "asc" | "desc";

type FilterState = {
  persona: string;
  grupo: string;
  equipo: string;
  empresa: string;
  floorId: string;
};

const EMPTY_FILTERS: FilterState = {
  persona: "",
  grupo: "",
  equipo: "",
  empresa: "",
  floorId: "",
};

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "floorName", label: "Planta" },
  { key: "puesto", label: "Puesto" },
  { key: "estado", label: "Estado" },
  { key: "grupo", label: "Grupo" },
  { key: "equipo", label: "Equipo" },
  { key: "persona", label: "Persona" },
  { key: "empresa", label: "Empresa" },
];

function displayValue(value: string) {
  return value.trim() || "—";
}

function estadoLabel(estado: SeatSearchRow["estado"]) {
  return estado === "ocupado" ? "Ocupado" : "Disponible";
}

function compareFloorThenPuesto(left: SeatSearchRow, right: SeatSearchRow) {
  const floorCmp = left.floorName.localeCompare(right.floorName, "es");
  if (floorCmp !== 0) {
    return floorCmp;
  }
  return left.puesto.localeCompare(right.puesto, "es", { numeric: true });
}

function sortRows(rows: SeatSearchRow[], key: SortKey | null, dir: SortDir) {
  if (key === null) {
    return [...rows].sort(compareFloorThenPuesto);
  }

  return [...rows].sort((left, right) => {
    const leftValue =
      key === "estado"
        ? estadoLabel(left.estado).toLocaleLowerCase("es")
        : (left[key] || "").trim().toLocaleLowerCase("es");
    const rightValue =
      key === "estado"
        ? estadoLabel(right.estado).toLocaleLowerCase("es")
        : (right[key] || "").trim().toLocaleLowerCase("es");

    if (leftValue < rightValue) {
      return dir === "asc" ? -1 : 1;
    }
    if (leftValue > rightValue) {
      return dir === "asc" ? 1 : -1;
    }
    return compareFloorThenPuesto(left, right);
  });
}

export function SeatsConsultation({
  organizationId,
  organizationName,
  layoutBasePath,
  backHref,
}: SeatsConsultationProps) {
  const [options, setOptions] = useState<SeatSearchOptions | null>(null);
  const [buildingSeats, setBuildingSeats] = useState<SeatSearchRow[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingBuilding, setLoadingBuilding] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const loadOptions = useCallback(async () => {
    setError("");
    setInitialLoading(true);
    try {
      const res = await fetch("/api/seats/search", withOrgContext(organizationId));
      const data = (await res.json()) as {
        options?: SeatSearchOptions;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar la consulta");
        setOptions(null);
        return;
      }

      setOptions(data.options ?? null);
    } finally {
      setInitialLoading(false);
    }
  }, [organizationId]);

  const loadBuildingSeats = useCallback(
    async (buildingId: string) => {
      if (!buildingId) {
        setBuildingSeats([]);
        return;
      }

      setError("");
      setLoadingBuilding(true);
      try {
        const params = new URLSearchParams({ buildingId });
        const res = await fetch(
          `/api/seats/search?${params.toString()}`,
          withOrgContext(organizationId),
        );
        const data = (await res.json()) as {
          seats?: SeatSearchRow[];
          error?: string;
        };

        if (!res.ok) {
          setError(data.error ?? "No se pudieron cargar los puestos");
          setBuildingSeats([]);
          return;
        }

        setBuildingSeats(data.seats ?? []);
      } finally {
        setLoadingBuilding(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const visibleFloors = useMemo(() => {
    if (!options || !selectedBuildingId) {
      return [];
    }
    return options.floors.filter((floor) => floor.buildingId === selectedBuildingId);
  }, [options, selectedBuildingId]);

  const selectedBuildingName = useMemo(
    () => options?.buildings.find((building) => building.id === selectedBuildingId)?.name,
    [options, selectedBuildingId],
  );

  const filteredSeats = useMemo(
    () => filterSeatRows(buildingSeats, filters),
    [buildingSeats, filters],
  );

  const sortedSeats = useMemo(
    () => sortRows(filteredSeats, sortKey, sortDir),
    [filteredSeats, sortKey, sortDir],
  );

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value.trim().length > 0),
    [filters],
  );

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSelectBuilding(buildingId: string) {
    if (buildingId === selectedBuildingId) {
      return;
    }
    setSelectedBuildingId(buildingId);
    setFilters(EMPTY_FILTERS);
    setSortKey(null);
    setSortDir("asc");
    void loadBuildingSeats(buildingId);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function handleResetFilters() {
    setFilters(EMPTY_FILTERS);
    setSortKey(null);
    setSortDir("asc");
  }

  if (initialLoading) {
    return <SeatsConsultationSkeleton />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <LoadingOverlay visible={loadingBuilding} message="Cargando puestos…" />

      <section className="shrink-0">
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Consulta de plantas</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Selecciona un edificio y filtra puestos por planta, persona, grupo, equipo o empresa.
        </p>
      </section>

      <section className="card-executive shrink-0 rounded-2xl p-4">
        {options?.buildings.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No hay edificios en esta organización.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {options?.buildings.map((building) => {
                const active = selectedBuildingId === building.id;
                return (
                  <button
                    key={building.id}
                    type="button"
                    onClick={() => handleSelectBuilding(building.id)}
                    className={
                      active
                        ? "btn-amber shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium"
                        : "btn-outline-amber shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium"
                    }
                  >
                    {building.name}
                  </button>
                );
              })}

              {selectedBuildingId && hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn-outline-amber ml-auto shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium"
                >
                  Limpiar
                </button>
              )}
            </div>

            {selectedBuildingId && (
              <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                <label className="block min-w-[7.5rem] flex-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                    Planta
                  </span>
                  <select
                    value={filters.floorId}
                    onChange={(event) => updateFilter("floorId", event.target.value)}
                    className="mt-0.5 w-full rounded-lg input-field px-2.5 py-1.5 text-sm"
                  >
                    <option value="">Todas</option>
                    {visibleFloors.map((floor) => (
                      <option key={floor.id} value={floor.id}>
                        {floor.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block min-w-[7.5rem] flex-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                    Persona
                  </span>
                  <input
                    value={filters.persona}
                    onChange={(event) => updateFilter("persona", event.target.value)}
                    placeholder="Nombre…"
                    className="mt-0.5 w-full rounded-lg input-field px-2.5 py-1.5 text-sm"
                  />
                </label>

                <label className="block min-w-[7.5rem] flex-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                    Grupo
                  </span>
                  <select
                    value={filters.grupo}
                    onChange={(event) => updateFilter("grupo", event.target.value)}
                    className="mt-0.5 w-full rounded-lg input-field px-2.5 py-1.5 text-sm"
                  >
                    <option value="">Todos</option>
                    {options?.catalogs.grupo.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block min-w-[7.5rem] flex-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                    Equipo
                  </span>
                  <select
                    value={filters.equipo}
                    onChange={(event) => updateFilter("equipo", event.target.value)}
                    className="mt-0.5 w-full rounded-lg input-field px-2.5 py-1.5 text-sm"
                  >
                    <option value="">Todos</option>
                    {options?.catalogs.equipo.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block min-w-[7.5rem] flex-1">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                    Empresa
                  </span>
                  <select
                    value={filters.empresa}
                    onChange={(event) => updateFilter("empresa", event.target.value)}
                    className="mt-0.5 w-full rounded-lg input-field px-2.5 py-1.5 text-sm"
                  >
                    <option value="">Todas</option>
                    {options?.catalogs.empresa.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card-executive flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-strong)] px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--besharpx-amber)]">
            Resultados
            {selectedBuildingName && (
              <span className="ml-2 font-normal normal-case text-[var(--muted)]">
                · {selectedBuildingName}
              </span>
            )}
          </h2>
          {selectedBuildingId && !loadingBuilding && (
            <p className="text-sm text-[var(--muted)]">
              {sortedSeats.length} puesto{sortedSeats.length === 1 ? "" : "s"}
              {hasActiveFilters && buildingSeats.length !== sortedSeats.length && (
                <span> de {buildingSeats.length}</span>
              )}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {error && <p className="px-4 py-6 text-sm text-red-300">{error}</p>}

          {!error && !selectedBuildingId && (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              Selecciona un edificio para ver sus puestos.
            </p>
          )}

          {!error && selectedBuildingId && !loadingBuilding && buildingSeats.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              Este edificio no tiene puestos registrados.
            </p>
          )}

          {!error && selectedBuildingId && !loadingBuilding && buildingSeats.length > 0 && sortedSeats.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              No hay puestos que coincidan con los criterios seleccionados.
            </p>
          )}

          {!error && selectedBuildingId && !loadingBuilding && sortedSeats.length > 0 && (
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[var(--card)] shadow-[0_1px_0_var(--border-strong)]">
                <tr className="border-b border-[var(--border-strong)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  {COLUMNS.map((column) => {
                    const active = sortKey === column.key;
                    const isDefaultSort =
                      sortKey === null && (column.key === "floorName" || column.key === "puesto");
                    return (
                      <th key={column.key} className="px-4 py-2.5 font-medium">
                        <button
                          type="button"
                          onClick={() => handleSort(column.key)}
                          className={`inline-flex items-center gap-1 transition hover:text-[var(--besharpx-amber)] ${
                            active || isDefaultSort ? "text-[var(--foreground)]" : ""
                          }`}
                        >
                          {column.label}
                          <span aria-hidden className="text-[10px]">
                            {active
                              ? sortDir === "asc"
                                ? "▲"
                                : "▼"
                              : isDefaultSort
                                ? "▲"
                                : "↕"}
                          </span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-4 py-2.5 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sortedSeats.map((seat) => (
                  <tr key={seat.id} className="hover:bg-[var(--field)]/50">
                    <td className="px-4 py-2.5 font-medium">{seat.floorName}</td>
                    <td className="px-4 py-2.5 font-medium">{seat.puesto}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          seat.estado === "ocupado"
                            ? "text-[var(--besharpx-amber)]"
                            : "text-[var(--muted)]"
                        }
                      >
                        {estadoLabel(seat.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted)]">{displayValue(seat.grupo)}</td>
                    <td className="px-4 py-2.5 text-[var(--muted)]">{displayValue(seat.equipo)}</td>
                    <td className="px-4 py-2.5">{displayValue(seat.persona)}</td>
                    <td className="px-4 py-2.5 text-[var(--muted)]">{displayValue(seat.empresa)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <LoadingLink
                        href={`${layoutBasePath}/${seat.floorId}/layout`}
                        message="Abriendo planta…"
                        className="btn-outline-amber inline-block rounded-lg px-2.5 py-1 text-xs"
                      >
                        Ver planta
                      </LoadingLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function SeatsConsultationSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <section className="shrink-0 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </section>
      <section className="card-executive shrink-0 space-y-3 rounded-2xl p-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex flex-wrap gap-2 lg:flex-nowrap">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 min-w-[7.5rem] flex-1" />
          ))}
        </div>
      </section>
      <section className="card-executive flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        <div className="shrink-0 border-b border-[var(--border-strong)] px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
