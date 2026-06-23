"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CatalogInput } from "@/components/catalog-input";
import { usePageHeaderTitle } from "@/components/page-header-title";
import type { FloorLayoutData } from "@/lib/floor-layout-data";
import {
  computeFittedPlanFrame,
  pointerToImagePercent,
  toImageSpacePosition,
  type PlanPosition,
} from "@/lib/floor-plan-frame";
import {
  floatingPanelColumnCount,
  floatingPanelWidthClass,
} from "@/lib/floor-limits";
import { withOrgContext } from "@/lib/org-api-client";

type Position = PlanPosition;

type Seat = {
  id: string;
  code: string;
  position: Position | null;
  grupo: string;
  equipo: string;
  empresa: string;
  persona: string;
  estado: "disponible" | "ocupado";
};

type Room = {
  id: string;
  code: string;
  position: Position | null;
  capacidad: number;
  medios: boolean;
};

type LayoutData = FloorLayoutData;

type DragPayload =
  | { kind: "seat"; id: string; code: string }
  | { kind: "room"; id: string; code: string };

type FloorLayoutEditorProps = {
  floorId: string;
  organizationId?: string;
  initialData?: LayoutData;
};

function flattenFloatingItems(
  unplacedSeats: { id: string; code: string }[],
  unplacedRooms: { id: string; code: string }[],
): DragPayload[] {
  return [
    ...unplacedSeats.map((seat) => ({ kind: "seat" as const, id: seat.id, code: seat.code })),
    ...unplacedRooms.map((room) => ({ kind: "room" as const, id: room.id, code: room.code })),
  ];
}

function isSeatOccupied(seat: Seat) {
  return seat.estado === "ocupado" || Boolean(seat.persona.trim());
}

function OccupiedSeatTooltip({ seat }: { seat: Seat }) {
  if (!isSeatOccupied(seat)) {
    return null;
  }

  const details = [
    { label: "Grupo", value: seat.grupo.trim() },
    { label: "Equipo", value: seat.equipo.trim() },
    { label: "Empresa", value: seat.empresa.trim() },
  ].filter((item) => item.value.length > 0);

  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-2 py-1.5 text-left opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
    >
      <span className="block text-[11px] font-semibold leading-tight text-[var(--besharpx-amber)]">
        {seat.persona.trim()}
      </span>
      {details.map((item) => (
        <span key={item.label} className="mt-0.5 block text-[10px] leading-tight text-white/85">
          {item.label}: {item.value}
        </span>
      ))}
    </span>
  );
}

function PlantedRoomTooltip({ room }: { room: Room }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-30 w-max max-w-[200px] -translate-x-1/2 rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-2 py-1.5 text-left opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
    >
      <span className="block text-[11px] font-semibold leading-tight text-sky-300">
        Sala {room.code}
      </span>
      <span className="mt-0.5 block text-[10px] leading-tight text-white/85">
        Capacidad: {room.capacidad} puestos
      </span>
      <span className="mt-0.5 block text-[10px] leading-tight text-white/85">
        Medios: {room.medios ? "Sí" : "No"}
      </span>
    </span>
  );
}

const MOVE_DRAG_THRESHOLD_PX = 4;

export function FloorLayoutEditor({
  floorId,
  organizationId,
  initialData,
}: FloorLayoutEditorProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const layoutMigratedRef = useRef(false);
  const moveSessionRef = useRef<{
    pointerId: number;
    target: HTMLElement;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [data, setData] = useState<LayoutData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const [formGrupo, setFormGrupo] = useState("");
  const [formEquipo, setFormEquipo] = useState("");
  const [formEmpresa, setFormEmpresa] = useState("");
  const [formPersona, setFormPersona] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [migratingLayout, setMigratingLayout] = useState(
    () => Boolean(initialData?.canWrite && initialData.floor.layoutPositionSpace === "container"),
  );

  const planFrame = useMemo(
    () => computeFittedPlanFrame(viewportSize, imageNaturalSize),
    [viewportSize, imageNaturalSize],
  );

  useEffect(() => {
    if (loading) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewportSize({ width, height });
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, [data?.floor.imageUrl, loading]);

  useEffect(() => {
    layoutMigratedRef.current = false;
    setImageNaturalSize({ width: 0, height: 0 });
    setViewportSize({ width: 0, height: 0 });
    setMigratingLayout(
      Boolean(data?.canWrite && data?.floor.layoutPositionSpace === "container"),
    );
  }, [floorId]);

  useEffect(() => {
    const imageUrl = data?.floor.imageUrl;
    if (!imageUrl) {
      return;
    }

    const probe = new window.Image();
    probe.onload = () => {
      setImageNaturalSize({ width: probe.naturalWidth, height: probe.naturalHeight });
    };
    probe.src = imageUrl;
  }, [data?.floor.imageUrl, floorId]);

  const resolveDisplayPosition = useCallback(
    (position: Position | null): Position | null => {
      if (!position || !data || !planFrame.width) {
        return position;
      }
      return toImageSpacePosition(
        position,
        data.floor.layoutPositionSpace,
        planFrame,
        viewportSize,
      );
    },
    [data, planFrame, viewportSize],
  );

  const migrateLayoutPositions = useCallback(async () => {
    if (!data?.canWrite || data.floor.layoutPositionSpace === "image") {
      setMigratingLayout(false);
      return;
    }

    const hasPlaced =
      data.seats.some((seat) => seat.position) || data.rooms.some((room) => room.position);

    if (hasPlaced && !planFrame.width) {
      return;
    }

    setMigratingLayout(true);

    const seats = data.seats.map((seat) => ({
      id: seat.id,
      position:
        seat.position && hasPlaced
          ? toImageSpacePosition(seat.position, "container", planFrame, viewportSize)
          : seat.position,
    }));
    const rooms = data.rooms.map((room) => ({
      id: room.id,
      position:
        room.position && hasPlaced
          ? toImageSpacePosition(room.position, "container", planFrame, viewportSize)
          : room.position,
    }));

    try {
      const res = await fetch(
        `/api/floors/${floorId}/migrate-layout-positions`,
        withOrgContext(organizationId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seats, rooms }),
        }),
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "No se pudo migrar el layout");
        layoutMigratedRef.current = false;
        return;
      }

      setData((current) => {
        if (!current) {
          return current;
        }
        const seatById = new Map(seats.map((seat) => [seat.id, seat.position]));
        const roomById = new Map(rooms.map((room) => [room.id, room.position]));
        return {
          ...current,
          floor: { ...current.floor, layoutPositionSpace: "image" },
          seats: current.seats.map((seat) => ({
            ...seat,
            position: seatById.get(seat.id) ?? seat.position,
          })),
          rooms: current.rooms.map((room) => ({
            ...room,
            position: roomById.get(room.id) ?? room.position,
          })),
        };
      });
    } finally {
      setMigratingLayout(false);
    }
  }, [data, floorId, organizationId, planFrame, viewportSize]);

  useEffect(() => {
    if (!data?.canWrite || data.floor.layoutPositionSpace === "image" || layoutMigratedRef.current) {
      return;
    }

    const hasPlaced =
      data.seats.some((seat) => seat.position) || data.rooms.some((room) => room.position);

    if (hasPlaced && (!planFrame.width || !imageNaturalSize.width)) {
      return;
    }

    layoutMigratedRef.current = true;
    void migrateLayoutPositions();
  }, [data, planFrame.width, imageNaturalSize.width, migrateLayoutPositions]);

  const loadLayout = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/floors/${floorId}/layout`, withOrgContext(organizationId));
    const json = (await res.json()) as LayoutData & { error?: string };
    if (!res.ok) {
      setError(json.error ?? "No se pudo cargar la planta");
      setData(null);
    } else {
      setData(json);
    }
    setLoading(false);
  }, [floorId, organizationId]);

  useEffect(() => {
    if (initialData) {
      return;
    }
    void loadLayout();
  }, [initialData, loadLayout]);

  const selectedSeat = useMemo(
    () => data?.seats.find((seat) => seat.id === selectedSeatId) ?? null,
    [data, selectedSeatId],
  );

  const selectedRoom = useMemo(
    () => data?.rooms.find((room) => room.id === selectedRoomId) ?? null,
    [data, selectedRoomId],
  );

  useEffect(() => {
    if (selectedSeat) {
      setFormGrupo(selectedSeat.grupo);
      setFormEquipo(selectedSeat.equipo);
      setFormEmpresa(selectedSeat.empresa);
      setFormPersona(selectedSeat.persona);
      setSelectedRoomId(null);
    }
  }, [selectedSeat]);

  const unplacedSeats = useMemo(
    () => data?.seats.filter((seat) => !seat.position) ?? [],
    [data],
  );
  const unplacedRooms = useMemo(
    () => data?.rooms.filter((room) => !room.position) ?? [],
    [data],
  );

  const floatingItems = useMemo(
    () => flattenFloatingItems(unplacedSeats, unplacedRooms),
    [unplacedSeats, unplacedRooms],
  );

  usePageHeaderTitle(
    data ? `Asignar puestos: ${data.floor.name}-${data.building.name}` : null,
  );

  function selectSeat(seatId: string) {
    setSelectedSeatId(seatId);
    setSelectedRoomId(null);
  }

  function selectRoom(roomId: string) {
    setSelectedRoomId(roomId);
    setSelectedSeatId(null);
  }

  function updateSeatLocal(seatId: string, patch: Partial<Seat>) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            seats: prev.seats.map((seat) =>
              seat.id === seatId ? { ...seat, ...patch } : seat,
            ),
          }
        : prev,
    );
  }

  function updateRoomLocal(roomId: string, patch: Partial<Room>) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            rooms: prev.rooms.map((room) =>
              room.id === roomId ? { ...room, ...patch } : room,
            ),
          }
        : prev,
    );
  }

  async function saveSeat(
    seatId: string,
    patch: {
      position?: Position | null;
      grupo?: string;
      equipo?: string;
      empresa?: string;
      persona?: string;
    },
  ) {
    const res = await fetch(
      `/api/seats/${seatId}`,
      withOrgContext(organizationId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
    const json = (await res.json()) as { seat?: Seat; error?: string };
    if (!res.ok || !json.seat) {
      throw new Error(json.error ?? "No se pudo guardar el puesto");
    }
    updateSeatLocal(seatId, json.seat);
    if (json.seat.grupo || json.seat.equipo || json.seat.empresa) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              catalogs: {
                grupo: prev.catalogs.grupo.includes(json.seat!.grupo)
                  ? prev.catalogs.grupo
                  : [...prev.catalogs.grupo, json.seat!.grupo].filter(Boolean).sort(),
                equipo: prev.catalogs.equipo.includes(json.seat!.equipo)
                  ? prev.catalogs.equipo
                  : [...prev.catalogs.equipo, json.seat!.equipo].filter(Boolean).sort(),
                empresa: prev.catalogs.empresa.includes(json.seat!.empresa)
                  ? prev.catalogs.empresa
                  : [...prev.catalogs.empresa, json.seat!.empresa].filter(Boolean).sort(),
              },
            }
          : prev,
      );
    }
    return json.seat;
  }

  async function saveRoom(roomId: string, patch: { position?: Position | null }) {
    const res = await fetch(
      `/api/rooms/${roomId}`,
      withOrgContext(organizationId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
    const json = (await res.json()) as { room?: Room; error?: string };
    if (!res.ok || !json.room) {
      throw new Error(json.error ?? "No se pudo guardar la sala");
    }
    updateRoomLocal(roomId, json.room);
    return json.room;
  }

  function getPositionFromPointer(clientX: number, clientY: number): Position | null {
    const viewport = viewportRef.current;
    if (!viewport || !planFrame.width) {
      return null;
    }
    return pointerToImagePercent(clientX, clientY, viewport.getBoundingClientRect(), planFrame);
  }

  async function placeItem(payload: DragPayload, position: Position) {
    if (!data?.canWrite) return;
    setError("");
    try {
      if (payload.kind === "seat") {
        await saveSeat(payload.id, { position });
        selectSeat(payload.id);
      } else {
        await saveRoom(payload.id, { position });
        selectRoom(payload.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al colocar");
    }
  }

  async function handleCanvasDrop(event: React.DragEvent) {
    event.preventDefault();
    if (!dragging) return;
    const position = getPositionFromPointer(event.clientX, event.clientY);
    if (!position) return;
    await placeItem(dragging, position);
    setDragging(null);
  }

  function startMove(kind: "seat" | "room", id: string, event: React.PointerEvent) {
    if (!data?.canWrite) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    moveSessionRef.current = {
      pointerId: event.pointerId,
      target,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    setMovingId(`${kind}:${id}`);
    target.setPointerCapture(event.pointerId);
  }

  async function handlePointerMove(event: React.PointerEvent) {
    if (!movingId || !data?.canWrite) return;
    const session = moveSessionRef.current;
    if (!session) return;

    if (!session.moved) {
      const dx = event.clientX - session.startX;
      const dy = event.clientY - session.startY;
      if (Math.hypot(dx, dy) < MOVE_DRAG_THRESHOLD_PX) {
        return;
      }
      session.moved = true;
    }

    const position = getPositionFromPointer(event.clientX, event.clientY);
    if (!position) return;
    const [kind, id] = movingId.split(":");
    if (kind === "seat") {
      updateSeatLocal(id, { position });
    } else {
      updateRoomLocal(id, { position });
    }
  }

  async function handlePointerUp(event: React.PointerEvent) {
    if (!movingId || !data?.canWrite) return;
    const session = moveSessionRef.current;
    const [kind, id] = movingId.split(":");
    setMovingId(null);
    moveSessionRef.current = null;

    if (session?.target.hasPointerCapture(session.pointerId)) {
      session.target.releasePointerCapture(session.pointerId);
    }

    if (!session?.moved) {
      return;
    }

    const position = getPositionFromPointer(event.clientX, event.clientY);
    if (!position) return;
    try {
      if (kind === "seat") {
        await saveSeat(id, { position });
      } else {
        await saveRoom(id, { position });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al mover");
      void loadLayout();
    }
  }

  async function handleRemoveFromMap(kind: "seat" | "room", id: string) {
    if (!data?.canWrite) return;
    try {
      if (kind === "seat") {
        await saveSeat(id, { position: null });
        setSelectedSeatId(null);
        setFormGrupo("");
        setFormEquipo("");
        setFormEmpresa("");
        setFormPersona("");
      } else {
        await saveRoom(id, { position: null });
        setSelectedRoomId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al quitar");
    }
  }

  async function handleAssignSeat() {
    if (!selectedSeat || !data?.canWrite) return;
    if (!formPersona.trim()) {
      setError("Indica la persona para asignar el puesto.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await saveSeat(selectedSeat.id, {
        grupo: formGrupo,
        equipo: formEquipo,
        empresa: formEmpresa,
        persona: formPersona,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar");
    } finally {
      setSaving(false);
    }
  }

  async function handleReleaseSeat() {
    if (!selectedSeat || !data?.canWrite) return;

    setSaving(true);
    setError("");
    try {
      await saveSeat(selectedSeat.id, {
        position: null,
        grupo: "",
        equipo: "",
        empresa: "",
        persona: "",
      });
      setSelectedSeatId(null);
      setFormGrupo("");
      setFormEquipo("");
      setFormEmpresa("");
      setFormPersona("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al liberar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Cargando planta…</p>;
  }

  if (!data) {
    return <p className="text-sm text-red-300">{error || "Planta no disponible"}</p>;
  }

  const placedSeats = data.seats.filter((seat) => seat.position);
  const placedRooms = data.rooms.filter((room) => room.position);
  const seatOccupied = selectedSeat ? isSeatOccupied(selectedSeat) : false;
  const floatingColumns = floatingPanelColumnCount(data.floor.totalSeats);
  const floatingAsideClass = floatingPanelWidthClass(data.floor.totalSeats);

  return (
    <div className="flex h-[calc(100dvh-var(--app-header-h)-var(--app-main-py))] flex-col overflow-hidden">
      {error && (
        <p className="mb-2 shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {data.canWrite && (
          <aside
            className={`card-executive flex ${floatingAsideClass} shrink-0 flex-col overflow-hidden rounded-2xl p-2`}
          >
            <p className="mb-1.5 shrink-0 text-center text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
              Flotantes
            </p>
            <div
              className={`grid min-h-0 flex-1 gap-1 overflow-y-auto content-start ${
                floatingColumns === 3 ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              {floatingItems.map((item) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  draggable
                  onDragStart={() => setDragging(item)}
                  onDragEnd={() => setDragging(null)}
                  className={
                    item.kind === "seat"
                      ? "min-w-0 rounded-md border border-dashed border-[var(--besharpx-amber)]/50 bg-[var(--besharpx-amber)]/10 px-0.5 py-1 text-center text-[11px] font-semibold leading-none text-[var(--besharpx-amber)]"
                      : "min-w-0 rounded-md border border-dashed border-sky-400/50 bg-sky-400/10 px-0.5 py-1 text-center text-[11px] font-semibold leading-none text-sky-300"
                  }
                >
                  {item.code}
                </button>
              ))}
            </div>
            {floatingItems.length === 0 && (
              <p className="text-center text-[10px] leading-tight text-[var(--muted)]">Todo colocado</p>
            )}
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
          <section className="card-executive shrink-0 rounded-2xl px-3 py-2.5">
            <div className="flex h-[58px] min-w-0 flex-nowrap items-end gap-2">
          <div
            key={selectedSeat?.id ?? selectedRoom?.id ?? "empty"}
            className="flex min-w-0 flex-1 flex-nowrap items-end gap-2"
          >
          {selectedSeat ? (
            <>
              <label className="w-12 shrink-0">
                <span className="text-xs font-medium text-[var(--muted)]">Puesto</span>
                <div className="mt-1 flex h-[34px] items-center justify-center rounded-lg border border-[var(--besharpx-amber)]/40 bg-[var(--besharpx-amber)]/10 text-sm font-bold text-[var(--besharpx-amber)]">
                  {selectedSeat.code}
                </div>
              </label>
              <div className="min-w-[72px] flex-1 basis-0">
                <CatalogInput
                  compact
                  label="Grupo"
                  listId="catalog-grupo-bar"
                  value={formGrupo}
                  options={data.catalogs.grupo}
                  onChange={setFormGrupo}
                  disabled={!data.canWrite || seatOccupied}
                />
              </div>
              <div className="min-w-[72px] flex-1 basis-0">
                <CatalogInput
                  compact
                  label="Equipo"
                  listId="catalog-equipo-bar"
                  value={formEquipo}
                  options={data.catalogs.equipo}
                  onChange={setFormEquipo}
                  disabled={!data.canWrite || seatOccupied}
                />
              </div>
              <div className="min-w-[80px] flex-1 basis-0">
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-[var(--muted)]">Persona</span>
                  <input
                    value={formPersona}
                    disabled={!data.canWrite || seatOccupied}
                    onChange={(e) => setFormPersona(e.target.value)}
                    placeholder="Nombre"
                    className="mt-1 w-full rounded-lg input-field px-2.5 py-2 text-sm disabled:opacity-60"
                  />
                </label>
              </div>
              <div className="min-w-[72px] flex-1 basis-0">
                <CatalogInput
                  compact
                  label="Empresa"
                  listId="catalog-empresa-bar"
                  value={formEmpresa}
                  options={data.catalogs.empresa}
                  onChange={setFormEmpresa}
                  disabled={!data.canWrite || seatOccupied}
                />
              </div>
            </>
          ) : selectedRoom ? (
            <>
              <label className="w-12 shrink-0">
                <span className="text-xs font-medium text-[var(--muted)]">Sala</span>
                <div className="mt-1 flex h-[34px] items-center justify-center rounded-lg border border-sky-400/40 bg-sky-400/10 text-sm font-bold text-sky-300">
                  {selectedRoom.code}
                </div>
              </label>
              <div className="min-w-[72px] flex-1 basis-0">
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-[var(--muted)]">Capacidad</span>
                  <input
                    readOnly
                    value={`${selectedRoom.capacidad} puestos`}
                    className="mt-1 w-full rounded-lg input-field px-2.5 py-2 text-sm opacity-80"
                  />
                </label>
              </div>
              <div className="min-w-[72px] flex-1 basis-0">
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-[var(--muted)]">Medios</span>
                  <input
                    readOnly
                    value={selectedRoom.medios ? "Con medios" : "Sin medios"}
                    className="mt-1 w-full rounded-lg input-field px-2.5 py-2 text-sm opacity-80"
                  />
                </label>
              </div>
              <div className="min-w-[80px] flex-1 basis-0">
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-[var(--muted)]">Persona</span>
                  <input
                    readOnly
                    value="—"
                    className="mt-1 w-full rounded-lg input-field px-2.5 py-2 text-sm opacity-40"
                  />
                </label>
              </div>
              <div className="min-w-[72px] flex-1 basis-0">
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-[var(--muted)]">Empresa</span>
                  <input
                    readOnly
                    value="—"
                    className="mt-1 w-full rounded-lg input-field px-2.5 py-2 text-sm opacity-40"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <label className="w-12 shrink-0">
                <span className="text-xs font-medium text-[var(--muted)]">Puesto</span>
                <div className="surface-inset mt-1 flex h-[34px] items-center justify-center rounded-lg text-sm text-[var(--muted)]">
                  —
                </div>
              </label>
              <div className="min-w-[72px] flex-1 basis-0">
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-[var(--muted)]">Grupo</span>
                  <input
                    readOnly
                    disabled
                    value=""
                    placeholder="—"
                    className="mt-1 w-full rounded-lg input-field px-2.5 py-2 text-sm opacity-40"
                  />
                </label>
              </div>
              <div className="min-w-[72px] flex-1 basis-0">
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-[var(--muted)]">Equipo</span>
                  <input
                    readOnly
                    disabled
                    value=""
                    placeholder="—"
                    className="mt-1 w-full rounded-lg input-field px-2.5 py-2 text-sm opacity-40"
                  />
                </label>
              </div>
              <div className="min-w-[80px] flex-1 basis-0">
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-[var(--muted)]">Persona</span>
                  <input
                    readOnly
                    disabled
                    value=""
                    placeholder={
                      data.canWrite
                        ? "Selecciona en el plano"
                        : "Ver asignación"
                    }
                    className="mt-1 w-full rounded-lg input-field px-2.5 py-2 text-sm opacity-40"
                  />
                </label>
              </div>
              <div className="min-w-[72px] flex-1 basis-0">
                <label className="block min-w-0">
                  <span className="text-xs font-medium text-[var(--muted)]">Empresa</span>
                  <input
                    readOnly
                    disabled
                    value=""
                    placeholder="—"
                    className="mt-1 w-full rounded-lg input-field px-2.5 py-2 text-sm opacity-40"
                  />
                </label>
              </div>
            </>
          )}
          </div>

          <div className="flex w-[148px] shrink-0 justify-end gap-2">
            {selectedSeat && data.canWrite ? (
              seatOccupied ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleReleaseSeat()}
                  className="whitespace-nowrap rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  {saving ? "…" : "Liberar"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleAssignSeat()}
                    className="btn-amber whitespace-nowrap rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                  >
                    {saving ? "…" : "Asignar"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleRemoveFromMap("seat", selectedSeat.id)}
                    className="btn-outline-amber whitespace-nowrap rounded-lg px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </>
              )
            ) : selectedRoom && data.canWrite ? (
              <button
                type="button"
                onClick={() => void handleRemoveFromMap("room", selectedRoom.id)}
                className="btn-outline-amber whitespace-nowrap rounded-lg px-3 py-2 text-sm"
              >
                Quitar
              </button>
            ) : null}
          </div>
            </div>
          </section>

          <section
            ref={viewportRef}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-black/40"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => void handleCanvasDrop(e)}
            onPointerMove={(e) => void handlePointerMove(e)}
            onPointerUp={(e) => void handlePointerUp(e)}
          >
            {migratingLayout && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-sm text-[var(--muted)]">
                Actualizando coordenadas del plano…
              </div>
            )}
            {data.floor.imageUrl ? (
              planFrame.width > 0 ? (
                <div
                  className="relative"
                  style={{ width: planFrame.width, height: planFrame.height }}
                >
                  <Image
                    src={data.floor.imageUrl}
                    alt={data.floor.name}
                    fill
                    className="select-none object-fill"
                    sizes={`${Math.round(planFrame.width)}px`}
                    priority
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      setImageNaturalSize({
                        width: image.naturalWidth,
                        height: image.naturalHeight,
                      });
                    }}
                  />
                  {placedSeats.map((seat) => {
                    const displayPosition = resolveDisplayPosition(seat.position);
                    if (!displayPosition) {
                      return null;
                    }
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        onClick={() => selectSeat(seat.id)}
                        onPointerDown={(e) => startMove("seat", seat.id, e)}
                        style={{
                          left: `${displayPosition.x}%`,
                          top: `${displayPosition.y}%`,
                        }}
                        className={`group absolute flex h-[22px] min-w-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border p-0 text-[10px] font-bold leading-none shadow-sm ring-1 ring-transparent ${
                          selectedSeatId === seat.id
                            ? "border-white bg-[var(--besharpx-amber)] text-[#171717] ring-white/70"
                            : isSeatOccupied(seat)
                              ? "border-[var(--besharpx-amber)] bg-[var(--besharpx-amber)]/90 text-[#171717]"
                              : "border-[var(--besharpx-amber)]/60 bg-[#171717]/90 text-[var(--besharpx-amber)]"
                        }`}
                      >
                        {seat.code}
                        <OccupiedSeatTooltip seat={seat} />
                      </button>
                    );
                  })}
                  {placedRooms.map((room) => {
                    const displayPosition = resolveDisplayPosition(room.position);
                    if (!displayPosition) {
                      return null;
                    }
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => selectRoom(room.id)}
                        onPointerDown={(e) => startMove("room", room.id, e)}
                        style={{
                          left: `${displayPosition.x}%`,
                          top: `${displayPosition.y}%`,
                        }}
                        className={`group absolute flex h-[22px] min-w-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded border px-0.5 text-[10px] font-bold leading-none shadow-sm ring-1 ring-transparent ${
                          selectedRoomId === room.id
                            ? "border-white bg-sky-400 text-[#171717] ring-white/70"
                            : "border-sky-400/70 bg-[#171717]/90 text-sky-300"
                        }`}
                      >
                        {room.code}
                        <PlantedRoomTooltip room={room} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="relative h-full w-full">
                  <Image
                    src={data.floor.imageUrl}
                    alt={data.floor.name}
                    fill
                    className="select-none object-contain object-center"
                    sizes="100vw"
                    priority
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      setImageNaturalSize({
                        width: image.naturalWidth,
                        height: image.naturalHeight,
                      });
                    }}
                  />
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--muted)]">
                Esta planta no tiene imagen.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
