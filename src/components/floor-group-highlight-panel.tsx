"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { GroupHighlightColor } from "@/lib/floor-group-highlight";

type FloorGroupHighlightPanelProps = {
  open: boolean;
  equipos: string[];
  colorMap: Map<string, GroupHighlightColor>;
  selectedEquipos: Set<string>;
  onToggleEquipo: (equipo: string) => void;
  onClose: () => void;
};

export function FloorGroupHighlightPanel({
  open,
  equipos,
  colorMap,
  selectedEquipos,
  onToggleEquipo,
  onClose,
}: FloorGroupHighlightPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );
  const [position, setPosition] = useState({ x: 24, y: 96 });

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  function handleDragStart(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: React.PointerEvent<HTMLDivElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }
    setPosition({
      x: Math.max(8, session.originX + (event.clientX - session.startX)),
      y: Math.max(8, session.originY + (event.clientY - session.startY)),
    });
  }

  function handleDragEnd(event: React.PointerEvent<HTMLDivElement>) {
    const session = dragRef.current;
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40" onClick={handleBackdropClick} role="presentation">
      <div
        ref={panelRef}
        className="card-executive absolute w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border-strong)] shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
        style={{ left: position.x, top: position.y }}
        role="dialog"
        aria-labelledby="equipo-highlight-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="flex cursor-grab items-center justify-between gap-2 border-b border-[var(--border-strong)] px-3 py-2 active:cursor-grabbing"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div className="min-w-0">
            <p
              id="equipo-highlight-title"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--besharpx-amber)]"
            >
              Iluminar equipos
            </p>
            <p className="text-[10px] text-[var(--muted)]">Arrastra · multiselección</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-[var(--muted)] transition hover:bg-[var(--field)] hover:text-[var(--foreground)]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[min(18rem,50vh)] overflow-y-auto p-3">
          {equipos.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No hay equipos en puestos plantados de esta planta.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {equipos.map((equipo) => {
                const color = colorMap.get(equipo);
                const active = selectedEquipos.has(equipo);
                return (
                  <button
                    key={equipo}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggleEquipo(equipo)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-all ${
                      active
                        ? "scale-[1.03] font-bold shadow-lg"
                        : "font-medium opacity-70 hover:opacity-100"
                    }`}
                    style={
                      color
                        ? active
                          ? {
                              backgroundColor: color.bg,
                              borderColor: color.border,
                              borderWidth: 2,
                              color: color.text,
                              boxShadow: `0 0 0 2px ${color.ring}, 0 0 18px ${color.ring}88`,
                            }
                          : {
                              backgroundColor: "var(--field)",
                              borderColor: "var(--border-strong)",
                              borderWidth: 1,
                              color: "var(--muted)",
                            }
                        : undefined
                    }
                  >
                    {active ? "● " : null}
                    {equipo}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MagnifyIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <circle cx="8.5" cy="8.5" r="4.75" />
      <path d="M12.5 12.5 16.5 16.5" strokeLinecap="round" />
    </svg>
  );
}

export function IlluminateToggleButton({
  active,
  disabled,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${
        active
          ? "border border-[var(--besharpx-amber)] bg-[var(--besharpx-amber)]/15 text-[var(--besharpx-amber)]"
          : "btn-outline-amber"
      }`}
      title="Iluminar equipos"
      aria-label="Iluminar equipos"
      aria-pressed={active}
    >
      <MagnifyIcon />
      Iluminar
    </button>
  );
}
