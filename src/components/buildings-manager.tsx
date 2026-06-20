"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FloorRoomsModal } from "@/components/floor-rooms-modal";
import { ImageCropUpload, type ImageCropUploadHandle } from "@/components/image-crop-upload";
import { BuildingsPageSkeleton } from "@/components/buildings-page-skeleton";
import { useConfirm } from "@/components/confirm-provider";
import { LoadingOverlay } from "@/components/loading-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { withOrgContext } from "@/lib/org-api-client";

type Building = {
  id: string;
  name: string;
  floorCount: number;
};

type Floor = {
  id: string;
  buildingId: string;
  name: string;
  imageUrl: string;
  totalSeats: number;
  totalRooms: number;
  assignedSeats: number;
};
type BuildingsManagerProps = {
  canWrite: boolean;
  organizationId?: string;
  organizationName?: string;
  backHref?: string;
  layoutBasePath?: string;
};

export function BuildingsManager({
  canWrite,
  organizationId,
  organizationName,
  backHref,
  layoutBasePath = "/org/floors",
}: BuildingsManagerProps) {
  const confirm = useConfirm();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floorsByBuilding, setFloorsByBuilding] = useState<Record<string, Floor[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [floorFormError, setFloorFormError] = useState("");

  const [newBuildingName, setNewBuildingName] = useState("");
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [editingBuildingName, setEditingBuildingName] = useState("");

  const [floorFormBuildingId, setFloorFormBuildingId] = useState<string | null>(null);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [floorName, setFloorName] = useState("");
  const [totalSeats, setTotalSeats] = useState(10);
  const [totalRooms, setTotalRooms] = useState(2);
  const [savingFloor, setSavingFloor] = useState(false);
  const [hasFloorImage, setHasFloorImage] = useState(false);
  const floorCropRef = useRef<ImageCropUploadHandle>(null);
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
  const [loadingFloorsId, setLoadingFloorsId] = useState<string | null>(null);
  const [roomsModalFloor, setRoomsModalFloor] = useState<Floor | null>(null);

  const loadBuildings = useCallback(async () => {
    setError("");
    const res = await fetch("/api/buildings", withOrgContext(organizationId));
    const data = (await res.json()) as { buildings?: Building[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "No se pudieron cargar los edificios");
      setBuildings([]);
    } else {
      setBuildings(data.buildings ?? []);
    }
    setInitialLoading(false);
  }, [organizationId]);

  const loadFloors = useCallback(async (buildingId: string) => {
    const res = await fetch(`/api/buildings/${buildingId}/floors`, withOrgContext(organizationId));
    const data = (await res.json()) as { floors?: Floor[] };
    setFloorsByBuilding((prev) => ({ ...prev, [buildingId]: data.floors ?? [] }));
  }, [organizationId]);

  useEffect(() => {
    void loadBuildings();
  }, [loadBuildings]);

  async function toggleBuilding(buildingId: string) {
    if (expandedId === buildingId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(buildingId);
    if (!floorsByBuilding[buildingId]) {
      setLoadingFloorsId(buildingId);
      try {
        await loadFloors(buildingId);
      } finally {
        setLoadingFloorsId(null);
      }
    }
  }

  async function handleCreateBuilding(event: React.FormEvent) {
    event.preventDefault();
    if (!canWrite || !newBuildingName.trim()) {
      return;
    }
    setOverlayMessage("Creando edificio…");
    try {
      const res = await fetch(
        "/api/buildings",
        withOrgContext(organizationId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newBuildingName.trim() }),
        }),
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el edificio");
        return;
      }
      setNewBuildingName("");
      await loadBuildings();
    } finally {
      setOverlayMessage(null);
    }
  }

  async function handleUpdateBuilding(buildingId: string) {
    if (!canWrite || !editingBuildingName.trim()) {
      return;
    }
    setOverlayMessage("Guardando edificio…");
    try {
      const res = await fetch(
        `/api/buildings/${buildingId}`,
        withOrgContext(organizationId, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editingBuildingName.trim() }),
        }),
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "No se pudo actualizar el edificio");
        return;
      }
      setEditingBuildingId(null);
      setEditingBuildingName("");
      await loadBuildings();
    } finally {
      setOverlayMessage(null);
    }
  }

  async function handleDeleteBuilding(buildingId: string, name: string) {
    if (!canWrite) {
      return;
    }
    const accepted = await confirm({
      message: `¿Eliminar el edificio "${name}" y todas sus plantas?`,
    });
    if (!accepted) {
      return;
    }
    setOverlayMessage("Eliminando edificio…");
    try {
      const res = await fetch(
        `/api/buildings/${buildingId}`,
        withOrgContext(organizationId, { method: "DELETE" }),
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "No se pudo eliminar el edificio");
        return;
      }
      if (expandedId === buildingId) {
        setExpandedId(null);
      }
      await loadBuildings();
    } finally {
      setOverlayMessage(null);
    }
  }

  async function handleApplyFloorCrop() {
    const cropped = await floorCropRef.current?.applyCrop();
    if (!cropped) {
      setFloorFormError("Selecciona una imagen antes de aplicar el recorte.");
    } else {
      setFloorFormError("");
    }
  }

  async function handleSaveFloor() {
    if (!canWrite || !floorFormBuildingId) {
      return;
    }

    if (!floorName.trim()) {
      setFloorFormError("Indica el nombre de la planta.");
      return;
    }

    const hasNewImage = floorCropRef.current?.hasImage() ?? false;
    const isEditing = Boolean(editingFloor);

    if (!isEditing && !hasNewImage) {
      setFloorFormError("Selecciona una imagen de planta.");
      return;
    }

    let imageFile: File | null = null;

    if (hasNewImage) {
      if (floorCropRef.current?.isCropApplied()) {
        imageFile = floorCropRef.current.getCroppedFile();
      } else {
        const accepted = await confirm({
          message: isEditing
            ? "¿Guardar la planta con la imagen sin recortar?"
            : "¿Estás seguro de guardar tu planta?",
          destructive: false,
        });
        if (!accepted) {
          return;
        }
        imageFile = floorCropRef.current?.getRawFile() ?? null;
      }
    }

    if (hasNewImage && !imageFile) {
      setFloorFormError("No se pudo preparar la imagen de la planta.");
      return;
    }

    setSavingFloor(true);
    setOverlayMessage("Guardando planta…");
    setFloorFormError("");
    const formData = new FormData();
    formData.append("name", floorName.trim());
    formData.append("totalSeats", String(totalSeats));
    formData.append("totalRooms", String(totalRooms));
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const res = await fetch(
        isEditing
          ? `/api/floors/${editingFloor!.id}`
          : `/api/buildings/${floorFormBuildingId}/floors`,
        withOrgContext(organizationId, {
          method: isEditing ? "PATCH" : "POST",
          body: formData,
        }),
      );
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setFloorFormError(data.error ?? "No se pudo guardar la planta");
        return;
      }

      const buildingId = floorFormBuildingId;
      closeFloorForm();
      await loadBuildings();
      await loadFloors(buildingId);
    } finally {
      setSavingFloor(false);
      setOverlayMessage(null);
    }
  }

  function openNewFloorForm(buildingId: string) {
    setEditingFloor(null);
    setFloorFormBuildingId(buildingId);
    setFloorName("");
    setTotalSeats(10);
    setTotalRooms(2);
    setHasFloorImage(false);
    setFloorFormError("");
  }

  function openEditFloorForm(floor: Floor) {
    setEditingFloor(floor);
    setFloorFormBuildingId(floor.buildingId);
    setFloorName(floor.name);
    setTotalSeats(floor.totalSeats);
    setTotalRooms(floor.totalRooms);
    setHasFloorImage(false);
    setFloorFormError("");
  }

  function closeFloorForm() {
    setFloorFormBuildingId(null);
    setEditingFloor(null);
    setFloorName("");
    setTotalSeats(10);
    setTotalRooms(2);
    setHasFloorImage(false);
    setFloorFormError("");
  }

  async function handleDeleteFloor(floor: Floor) {
    if (!canWrite) {
      return;
    }

    const summaryRes = await fetch(
      `/api/floors/${floor.id}/deletion-summary`,
      withOrgContext(organizationId),
    );
    const summary = summaryRes.ok
      ? ((await summaryRes.json()) as {
          occupiedSeats: number;
          assignedSeats: number;
          placedSeats: number;
          placedRooms: number;
        })
      : null;

    let message = `¿Eliminar la planta "${floor.name}"?`;
    if (summary) {
      const details: string[] = [];
      if (summary.occupiedSeats > 0) {
        details.push(`${summary.occupiedSeats} puesto(s) ocupado(s)`);
      }
      if (summary.assignedSeats > summary.occupiedSeats) {
        details.push(`${summary.assignedSeats} asignación(es) con persona`);
      }
      if (summary.placedSeats > 0) {
        details.push(`${summary.placedSeats} puesto(s) ubicados en el layout`);
      }
      if (summary.placedRooms > 0) {
        details.push(`${summary.placedRooms} sala(s) ubicadas en el layout`);
      }
      if (details.length > 0) {
        message += `\n\nSe eliminará también: ${details.join(", ")}.`;
      }
    }

    const accepted = await confirm({ message });
    if (!accepted) {
      return;
    }
    setOverlayMessage("Eliminando planta…");
    try {
      const res = await fetch(
        `/api/floors/${floor.id}`,
        withOrgContext(organizationId, { method: "DELETE" }),
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "No se pudo eliminar la planta");
        return;
      }
      await loadFloors(floor.buildingId);
      await loadBuildings();
    } finally {
      setOverlayMessage(null);
    }
  }

  if (initialLoading) {
    return (
      <>
        <LoadingOverlay visible={Boolean(overlayMessage)} message={overlayMessage ?? undefined} />
        <BuildingsPageSkeleton />
      </>
    );
  }

  return (
    <div className="space-y-8">
      <LoadingOverlay visible={Boolean(overlayMessage)} message={overlayMessage ?? undefined} />
      <section>
        {backHref && (
          <Link
            href={backHref}
            className="text-sm text-[var(--muted)] transition hover:text-[var(--besharpx-amber)]"
          >
            ← Panel maestro
          </Link>
        )}
        {organizationName && (
          <p className={`text-sm font-medium text-[var(--besharpx-amber)] ${backHref ? "mt-3" : ""}`}>
            {organizationName}
          </p>
        )}
        <h1 className={`text-2xl font-bold tracking-tight ${organizationName || backHref ? "mt-2" : ""}`}>
          Edificios y plantas
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {canWrite
            ? "Administra edificios, sube plantas con recorte y define puestos y salas."
            : "Consulta los edificios y plantas de tu organización."}
        </p>
      </section>

      {error && !floorFormBuildingId && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {canWrite && (
        <form onSubmit={handleCreateBuilding} className="card-executive flex flex-wrap gap-3 rounded-2xl p-6">
          <div className="min-w-[220px] flex-1">
            <label className="block">
              <span className="text-xs text-[var(--muted)]">Nuevo edificio</span>
              <input
                required
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                placeholder="Torre Central"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-elevated)] px-4 py-2.5"
              />
            </label>
          </div>
          <button type="submit" className="btn-amber self-end rounded-xl px-4 py-2.5 text-sm">
            Agregar edificio
          </button>
        </form>
      )}

      <section className="space-y-4">
        {buildings.length === 0 ? (
          <div className="card-executive rounded-2xl p-8 text-center text-[var(--muted)]">
            Aún no hay edificios registrados.
          </div>
        ) : (
          buildings.map((building) => {
            const expanded = expandedId === building.id;
            const floors = floorsByBuilding[building.id] ?? [];

            return (
              <article key={building.id} className="card-executive overflow-hidden rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-lg font-semibold">{building.name}</span>
                    <span className="rounded-full bg-[var(--card-elevated)] px-2.5 py-1 text-xs text-[var(--muted)]">
                      {building.floorCount} planta{building.floorCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleBuilding(building.id)}
                      className="btn-outline-amber rounded-lg px-3 py-2 text-sm font-medium"
                    >
                      {expanded ? "Ocultar plantas" : "Plantas"}
                    </button>

                    {canWrite &&
                      (editingBuildingId === building.id ? (
                        <>
                          <input
                            value={editingBuildingName}
                            onChange={(e) => setEditingBuildingName(e.target.value)}
                            className="rounded-lg border border-[var(--border)] bg-[var(--card-elevated)] px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => void handleUpdateBuilding(building.id)}
                            className="btn-amber rounded-lg px-3 py-2 text-sm"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingBuildingId(null)}
                            className="btn-outline-amber rounded-lg px-3 py-2 text-sm"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBuildingId(building.id);
                              setEditingBuildingName(building.name);
                            }}
                            className="btn-outline-amber rounded-lg px-3 py-2 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleDeleteBuilding(building.id, building.name)
                            }
                            className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300"
                          >
                            Eliminar
                          </button>
                        </>
                      ))}
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[var(--border)] p-5">
                    <h3 className="mb-4 font-medium">Plantas</h3>

                    {loadingFloorsId === building.id ? (
                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <Skeleton className="min-h-[280px] rounded-2xl" />
                        <Skeleton className="min-h-[280px] rounded-2xl" />
                        <Skeleton className="min-h-[280px] rounded-2xl" />
                      </div>
                    ) : (
                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {floors.map((floor) => (
                          <FloorCard
                            key={floor.id}
                            floor={floor}
                            canWrite={canWrite}
                            layoutBasePath={layoutBasePath}
                            onSalas={() => setRoomsModalFloor(floor)}
                            onEdit={() => openEditFloorForm(floor)}
                            onDelete={() => void handleDeleteFloor(floor)}
                          />
                        ))}
                        {canWrite && (
                          <NewFloorCard onClick={() => openNewFloorForm(building.id)} />
                        )}
                        {!canWrite && floors.length === 0 && (
                          <p className="text-sm text-[var(--muted)] md:col-span-2 xl:col-span-3">
                            Sin plantas todavía.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>

      {canWrite && floorFormBuildingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card-executive max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl p-6">
            <h2 className="text-xl font-semibold">
              {editingFloor ? "Editar planta" : "Nueva planta"}
            </h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs text-[var(--muted)]">Nombre de planta</span>
                <input
                  required
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  placeholder="Piso 12"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-elevated)] px-4 py-2.5"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-[var(--muted)]">Puestos (01–99)</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-elevated)] px-4 py-2.5"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-[var(--muted)]">Salas (S01…)</span>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    required
                    value={totalRooms}
                    onChange={(e) => setTotalRooms(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-elevated)] px-4 py-2.5"
                  />
                </label>
              </div>
              <ImageCropUpload
                ref={floorCropRef}
                key={editingFloor?.id ?? floorFormBuildingId}
                currentImageUrl={editingFloor?.imageUrl}
                label={editingFloor ? "Nueva imagen (opcional)" : "Imagen de planta"}
                onImageChange={setHasFloorImage}
              />
            </div>
            {floorFormError && (
              <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {floorFormError}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleApplyFloorCrop()}
                disabled={!hasFloorImage || savingFloor}
                className="btn-outline-amber rounded-xl px-4 py-2 text-sm disabled:opacity-50"
              >
                Aplicar recorte
              </button>
              <button
                type="button"
                onClick={() => void handleSaveFloor()}
                disabled={(!editingFloor && !hasFloorImage) || savingFloor}
                className="btn-amber rounded-xl px-4 py-2 text-sm disabled:opacity-50"
              >
                {savingFloor
                  ? "Guardando…"
                  : editingFloor
                    ? "Guardar cambios"
                    : "Guardar planta"}
              </button>
              <button
                type="button"
                onClick={closeFloorForm}
                className="btn-outline-amber rounded-xl px-4 py-2 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <FloorRoomsModal
        floorId={roomsModalFloor?.id ?? null}
        floorName={roomsModalFloor?.name ?? ""}
        organizationId={organizationId}
        canWrite={canWrite}
        onClose={() => setRoomsModalFloor(null)}
      />
    </div>
  );
}

function FloorPlanIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className="h-14 w-14 text-[var(--besharpx-amber)]"
    >
      <rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M6 20h36M18 20v18M30 20v18M6 30h36" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FloorCard({
  floor,
  canWrite,
  layoutBasePath,
  onSalas,
  onEdit,
  onDelete,
}: {
  floor: Floor;
  canWrite: boolean;
  layoutBasePath: string;
  onSalas: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="card-executive flex min-h-[280px] flex-col rounded-2xl p-6">
      <div className="flex h-24 items-center justify-center rounded-xl bg-[var(--card-elevated)]">
        <FloorPlanIcon />
      </div>
      <p className="mt-4 text-lg font-semibold tracking-tight">{floor.name}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[var(--card-elevated)] px-2 py-2">
          <p className="text-lg font-semibold">{floor.totalSeats}</p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Puestos</p>
        </div>
        <div className="rounded-lg bg-[var(--card-elevated)] px-2 py-2">
          <p className="text-lg font-semibold">{floor.assignedSeats}</p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Asignados</p>
        </div>
        <div className="rounded-lg bg-[var(--card-elevated)] px-2 py-2">
          <p className="text-lg font-semibold">{floor.totalRooms}</p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Salas</p>
        </div>
      </div>
      <div className="mt-auto space-y-2 pt-4">
        <Link
          href={`${layoutBasePath}/${floor.id}/layout`}
          className="btn-amber block rounded-xl py-2.5 text-center text-sm font-medium"
        >
          Gestionar
        </Link>
        <button
          type="button"
          onClick={onSalas}
          className="btn-outline-amber w-full rounded-xl py-2.5 text-sm font-medium"
        >
          Salas
        </button>
        {canWrite && (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="btn-outline-amber w-full rounded-xl py-2.5 text-sm font-medium"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="w-full rounded-xl border border-red-500/30 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10"
            >
              Eliminar
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function NewFloorCard({ onClick }: { onClick: () => void }) {
  return (
    <article className="card-executive flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--besharpx-amber)]/25 p-6">
      <button
        type="button"
        onClick={onClick}
        className="group flex flex-col items-center gap-4 rounded-2xl px-8 py-6 transition hover:bg-[var(--besharpx-amber)]/5"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--besharpx-amber)]/40 bg-[var(--besharpx-amber)]/10 text-2xl text-[var(--besharpx-amber)] transition group-hover:scale-105 group-hover:border-[var(--besharpx-amber)] group-hover:bg-[var(--besharpx-amber)]/20">
          +
        </span>
        <span className="text-center text-lg font-semibold tracking-tight text-[var(--besharpx-amber)]">
          Nueva planta
        </span>
      </button>
    </article>
  );
}