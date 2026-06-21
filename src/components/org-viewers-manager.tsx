"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  ViewerFloorAccessTree,
  type BuildingFloorOptions,
} from "@/components/viewer-floor-access-tree";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import { withOrgContext } from "@/lib/org-api-client";

type ViewerRow = {
  id: string;
  email: string;
  displayName: string;
  floorIds: string[];
};

type OrgViewersManagerProps = {
  organizationId?: string;
};

type ModalState =
  | { type: "create" }
  | { type: "permissions"; viewer: ViewerRow }
  | null;

function formatFloorCount(count: number) {
  if (count === 0) {
    return "Sin plantas";
  }
  return `${count} planta${count === 1 ? "" : "s"}`;
}

type ViewerModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
};

function ViewerModal({ open, title, subtitle, onClose, children, footer }: ViewerModalProps) {
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="card-executive flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-[var(--muted)]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[var(--muted)] transition hover:text-[var(--besharpx-amber)]"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function OrgViewersManager({ organizationId }: OrgViewersManagerProps) {
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [viewers, setViewers] = useState<ViewerRow[]>([]);
  const [buildings, setBuildings] = useState<BuildingFloorOptions[]>([]);
  const [modal, setModal] = useState<ModalState>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [floorIds, setFloorIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [viewersRes, optionsRes] = await Promise.all([
      fetch("/api/viewers", withOrgContext(organizationId)),
      fetch("/api/viewers/floor-options", withOrgContext(organizationId)),
    ]);
    const viewersData = (await viewersRes.json()) as { viewers?: ViewerRow[] };
    const optionsData = (await optionsRes.json()) as { buildings?: BuildingFloorOptions[] };
    setViewers(viewersData.viewers ?? []);
    setBuildings(optionsData.buildings ?? []);
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreateModal() {
    setEmail("");
    setDisplayName("");
    setFloorIds([]);
    setError("");
    setModal({ type: "create" });
  }

  function openPermissionsModal(viewer: ViewerRow) {
    setFloorIds(viewer.floorIds);
    setError("");
    setModal({ type: "permissions", viewer });
  }

  function closeModal() {
    setModal(null);
    setError("");
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        "/api/viewers",
        withOrgContext(organizationId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, displayName, floorIds }),
        }),
      );
      const data = (await res.json()) as { error?: string; viewer?: { email: string } };
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el viewer");
        showToast(data.error ?? "No se pudo crear el viewer", { variant: "error" });
        return;
      }
      showToast(`Viewer ${data.viewer?.email ?? email} creado correctamente`);
      closeModal();
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePermissions() {
    if (modal?.type !== "permissions") {
      return;
    }

    const viewerId = modal.viewer.id;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/viewers/${viewerId}`,
        withOrgContext(organizationId, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ floorIds }),
        }),
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar");
        showToast(data.error ?? "No se pudo guardar", { variant: "error" });
        return;
      }
      showToast("Permisos actualizados");
      closeModal();
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(viewer: ViewerRow) {
    const accepted = await confirm({
      message: `¿Eliminar al viewer "${viewer.email}"? Dejará de tener acceso a la organización.`,
      destructive: true,
      confirmLabel: "Eliminar",
    });
    if (!accepted) {
      return;
    }

    setDeletingId(viewer.id);
    try {
      const res = await fetch(
        `/api/viewers/${viewer.id}`,
        withOrgContext(organizationId, { method: "DELETE" }),
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(data.error ?? "No se pudo eliminar el viewer", { variant: "error" });
        return;
      }
      if (modal?.type === "permissions" && modal.viewer.id === viewer.id) {
        closeModal();
      }
      showToast(`Viewer ${viewer.email} eliminado`);
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  const isCreateOpen = modal?.type === "create";
  const isPermissionsOpen = modal?.type === "permissions";

  return (
    <div className="space-y-6">
      <section>
        {organizationId && (
          <Link
            href={`/admin/organizations/${organizationId}`}
            className="text-sm text-[var(--muted)] hover:text-[var(--besharpx-amber)]"
          >
            ← Organización
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold">Viewers</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Usuarios de solo lectura. Asigna las plantas que pueden consultar.
        </p>
      </section>

      <section className="card-executive overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--besharpx-amber)]">
            Lista
            {viewers.length > 0 && (
              <span className="ml-2 font-normal normal-case text-[var(--muted)]">
                ({viewers.length})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={openCreateModal}
            className="btn-amber rounded-lg px-3 py-1.5 text-sm"
          >
            Nuevo viewer
          </button>
        </div>

        {viewers.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">Aún no hay viewers.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Nombre</th>
                  <th className="px-4 py-2.5 font-medium">Plantas</th>
                  <th className="px-4 py-2.5 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {viewers.map((viewer) => (
                  <tr key={viewer.id} className="hover:bg-[var(--card-elevated)]/40">
                    <td className="px-4 py-2.5 font-medium">{viewer.email}</td>
                    <td className="px-4 py-2.5 text-[var(--muted)]">
                      {viewer.displayName || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted)]">
                      {formatFloorCount(viewer.floorIds.length)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openPermissionsModal(viewer)}
                          className="btn-outline-amber rounded-lg px-2.5 py-1 text-xs"
                        >
                          Permisos
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === viewer.id}
                          onClick={() => void handleDelete(viewer)}
                          className="rounded-lg border border-red-500/30 px-2.5 py-1 text-xs text-red-300 disabled:opacity-50"
                        >
                          {deletingId === viewer.id ? "…" : "Eliminar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ViewerModal
        open={isCreateOpen}
        title="Nuevo viewer"
        subtitle="Usuario de solo lectura"
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--card-elevated)] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="viewer-create-form"
              disabled={loading}
              className="btn-amber rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {loading ? "Creando…" : "Crear viewer"}
            </button>
          </>
        }
      >
        <form id="viewer-create-form" onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs text-[var(--muted)]">Email</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-elevated)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-[var(--muted)]">Nombre (opcional)</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-elevated)] px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-[var(--muted)]">Plantas (opcional)</p>
            <ViewerFloorAccessTree
              buildings={buildings}
              selectedFloorIds={floorIds}
              onChange={setFloorIds}
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </form>
      </ViewerModal>

      <ViewerModal
        open={isPermissionsOpen}
        title="Permisos"
        subtitle={modal?.type === "permissions" ? modal.viewer.email : undefined}
        onClose={closeModal}
        footer={
          <>
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--card-elevated)] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleSavePermissions()}
              className="btn-amber rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {loading ? "Guardando…" : "Guardar"}
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-[var(--muted)]">
          Selecciona las plantas que este viewer puede consultar.
        </p>
        <ViewerFloorAccessTree
          buildings={buildings}
          selectedFloorIds={floorIds}
          onChange={setFloorIds}
          disabled={loading}
        />
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </ViewerModal>
    </div>
  );
}
