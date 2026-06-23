"use client";

import { useCallback, useEffect, useState } from "react";

import { LoadingOverlay } from "@/components/loading-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { withOrgContext } from "@/lib/org-api-client";

type Room = {
  id: string;
  code: string;
  capacidad: number;
  medios: boolean;
};

type RoomDraft = {
  capacidad: string;
  medios: boolean;
};

type FloorRoomsModalProps = {
  floorId: string | null;
  floorName: string;
  organizationId?: string;
  canWrite: boolean;
  onClose: () => void;
};

export function FloorRoomsModal({
  floorId,
  floorName,
  organizationId,
  canWrite,
  onClose,
}: FloorRoomsModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [drafts, setDrafts] = useState<Record<string, RoomDraft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRooms = useCallback(async () => {
    if (!floorId) {
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch(`/api/floors/${floorId}/manage`, withOrgContext(organizationId));
    const json = (await res.json()) as { rooms?: Room[]; error?: string };
    if (!res.ok) {
      setError(json.error ?? "No se pudieron cargar las salas");
      setRooms([]);
    } else {
      const nextRooms = json.rooms ?? [];
      setRooms(nextRooms);
      setDrafts(
        Object.fromEntries(
          nextRooms.map((room) => [
            room.id,
            { capacidad: String(room.capacidad), medios: room.medios },
          ]),
        ),
      );
    }
    setLoading(false);
  }, [floorId, organizationId]);

  useEffect(() => {
    if (floorId) {
      void loadRooms();
    }
  }, [floorId, loadRooms]);

  function updateDraft(roomId: string, patch: Partial<RoomDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], ...patch },
    }));
  }

  function parseCapacidad(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 999) {
      return null;
    }
    return parsed;
  }

  function normalizeCapacidadInput(value: string) {
    const parsed = parseCapacidad(value);
    return parsed == null ? value.trim() : String(parsed);
  }

  async function handleSaveRooms() {
    if (!canWrite) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const changedRooms = rooms.filter((room) => {
        const draft = drafts[room.id];
        const capacidad = parseCapacidad(draft.capacidad);
        return capacidad !== room.capacidad || draft.medios !== room.medios;
      });

      if (changedRooms.length === 0) {
        setMessage("No hay cambios que guardar.");
        return;
      }

      for (const room of changedRooms) {
        const draft = drafts[room.id];
        const capacidad = parseCapacidad(draft.capacidad);
        if (capacidad == null) {
          throw new Error(`Indica una capacidad válida para la sala ${room.code}`);
        }
        const res = await fetch(
          `/api/rooms/${room.id}`,
          withOrgContext(organizationId, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              capacidad,
              medios: draft.medios,
            }),
          }),
        );
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? `No se pudo guardar la sala ${room.code}`);
        }
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar las salas");
    } finally {
      setSaving(false);
    }
  }

  if (!floorId) {
    return null;
  }

  const hasRoomChanges = rooms.some((room) => {
    const draft = drafts[room.id];
    const capacidad = parseCapacidad(draft.capacidad);
    return capacidad !== room.capacidad || draft.medios !== room.medios;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <LoadingOverlay visible={saving} message="Guardando salas…" />
      <div className="card-executive max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Salas</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{floorName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--muted)] transition hover:text-[var(--besharpx-amber)]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <p className="mt-4 text-sm text-[var(--muted)]">
          Capacidad y medios de cada sala.
        </p>

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        {loading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : rooms.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--muted)]">Esta planta no tiene salas.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {rooms.map((room) => {
              const draft = drafts[room.id];
              return (
                <div
                  key={room.id}
                  className="surface-inset grid gap-3 rounded-xl p-4 sm:grid-cols-[72px_1fr_1fr]"
                >
                  <p className="self-center text-sm font-semibold text-sky-300">{room.code}</p>
                  <label className="block">
                    <span className="text-xs text-[var(--muted)]">Capacidad (puestos)</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      inputMode="numeric"
                      value={draft?.capacidad ?? String(room.capacidad)}
                      disabled={!canWrite}
                      onChange={(event) =>
                        updateDraft(room.id, { capacidad: event.target.value })
                      }
                      onBlur={(event) =>
                        updateDraft(room.id, {
                          capacidad: normalizeCapacidadInput(event.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-xl input-field px-4 py-2.5 disabled:opacity-60"
                    />
                  </label>
                  <label className="flex items-end gap-2 pb-2.5">
                    <input
                      type="checkbox"
                      checked={draft?.medios ?? room.medios}
                      disabled={!canWrite}
                      onChange={(e) => updateDraft(room.id, { medios: e.target.checked })}
                    />
                    <span className="text-sm">Cuenta con medios</span>
                  </label>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {canWrite && rooms.length > 0 && (
            <button
              type="button"
              disabled={!hasRoomChanges || saving}
              onClick={() => void handleSaveRooms()}
              className="btn-amber rounded-xl px-4 py-2 text-sm disabled:opacity-50"
            >
              Guardar salas
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="btn-outline-amber rounded-xl px-4 py-2 text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
