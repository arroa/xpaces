"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DashboardOrganizationsSkeleton } from "@/components/dashboard-organizations-skeleton";
import { LoadingLink } from "@/components/loading-link";
import { LoadingOverlay } from "@/components/loading-overlay";

type OrganizationCard = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  orgAdmin: { id: string; email: string; displayName: string } | null;
  stats: { buildings: number; floors: number; viewers: number };
};

type Summary = {
  organizations: number;
  buildings: number;
  floors: number;
  viewers: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OrganizationEditCard({
  org,
  onSaved,
}: {
  org: OrganizationCard;
  onSaved: () => void;
}) {
  const [name, setName] = useState(org.name);
  const [orgAdminEmail, setOrgAdminEmail] = useState(org.orgAdmin?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(org.name);
    setOrgAdminEmail(org.orgAdmin?.email ?? "");
  }, [org]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, orgAdminEmail }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar");
        return;
      }
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="card-executive relative flex flex-col rounded-2xl p-6">
      <LoadingOverlay visible={loading} message="Guardando organización…" />
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col space-y-4">
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Nombre</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl input-field px-4 py-2.5"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Email OrgAdmin</span>
          <input
            type="email"
            required
            value={orgAdminEmail}
            onChange={(e) => setOrgAdminEmail(e.target.value)}
            className="mt-1 w-full rounded-xl input-field px-4 py-2.5"
          />
        </label>

        <p className="text-xs text-[var(--muted)]">
          Alta: {formatDate(org.createdAt)} · {org.slug}
        </p>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="surface-inset rounded-lg px-2 py-2">
            <p className="text-lg font-semibold">{org.stats.buildings}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Edificios</p>
          </div>
          <div className="surface-inset rounded-lg px-2 py-2">
            <p className="text-lg font-semibold">{org.stats.floors}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Plantas</p>
          </div>
          <div className="surface-inset rounded-lg px-2 py-2">
            <p className="text-lg font-semibold">{org.stats.viewers}</p>
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Viewers</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="mt-auto space-y-2 pt-2">
          <button type="submit" disabled={loading} className="btn-amber w-full rounded-xl py-2.5 text-sm">
            {loading ? "Guardando…" : "Guardar"}
          </button>
          <LoadingLink
            href={`/admin/organizations/${org.id}/buildings`}
            message="Abriendo edificios…"
            className="btn-outline-amber block rounded-xl py-2.5 text-center text-sm font-medium"
          >
            Gestionar
          </LoadingLink>
          <Link
            href={`/admin/organizations/${org.id}/viewers`}
            className="btn-outline-amber block rounded-xl py-2.5 text-center text-sm font-medium"
          >
            Viewers
          </Link>
        </div>
      </form>
    </article>
  );
}

function NewOrganizationCard({ onCreated }: { onCreated: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [orgAdminEmail, setOrgAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleCancel() {
    setExpanded(false);
    setName("");
    setOrgAdminEmail("");
    setError("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, orgAdminEmail }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la organización");
        return;
      }
      setName("");
      setOrgAdminEmail("");
      setExpanded(false);
      onCreated();
    } finally {
      setLoading(false);
    }
  }

  if (!expanded) {
    return (
      <article className="card-executive flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--besharpx-amber)]/25 p-6">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group flex flex-col items-center gap-4 rounded-2xl px-8 py-6 transition hover:bg-[var(--besharpx-amber)]/5"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--besharpx-amber)]/40 bg-[var(--besharpx-amber)]/10 text-2xl text-[var(--besharpx-amber)] transition group-hover:scale-105 group-hover:border-[var(--besharpx-amber)] group-hover:bg-[var(--besharpx-amber)]/20">
            +
          </span>
          <span className="text-center text-lg font-semibold tracking-tight text-[var(--besharpx-amber)]">
            Crear Nueva Organización
          </span>
        </button>
      </article>
    );
  }

  return (
    <article className="card-executive relative flex flex-col rounded-2xl border border-[var(--besharpx-amber)]/30 p-6">
      <LoadingOverlay visible={loading} message="Creando organización…" />
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col space-y-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-semibold">Nueva organización</p>
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-[var(--muted)] transition hover:text-[var(--besharpx-amber)]"
          >
            Cancelar
          </button>
        </div>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Nombre</span>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl input-field px-4 py-2.5"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Email OrgAdmin</span>
          <input
            type="email"
            required
            value={orgAdminEmail}
            onChange={(e) => setOrgAdminEmail(e.target.value)}
            className="mt-1 w-full rounded-xl input-field px-4 py-2.5"
          />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={loading} className="btn-amber mt-auto rounded-xl py-2.5 text-sm">
          {loading ? "Creando…" : "Crear organización"}
        </button>
      </form>
    </article>
  );
}

export function SuperAdminDashboard() {
  const [organizations, setOrganizations] = useState<OrganizationCard[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/organizations");
    const data = (await res.json()) as {
      organizations?: OrganizationCard[];
      summary?: Summary;
    };
    setOrganizations(data.organizations ?? []);
    setSummary(data.summary ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <section className="card-executive rounded-2xl px-8 py-6">
        <p className="section-kicker">Super admin</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Panel Maestro Xpaces</h1>
      </section>

      {summary && (
        <section className="card-executive flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl px-6 py-4 text-sm">
          {[
            { label: "Organizaciones", value: summary.organizations },
            { label: "Edificios", value: summary.buildings },
            { label: "Plantas", value: summary.floors },
            { label: "Viewers", value: summary.viewers },
          ].map((item) => (
            <span key={item.label} className="inline-flex items-baseline gap-2">
              <span className="text-[var(--muted)]">{item.label}</span>
              <span className="text-lg font-semibold text-[var(--besharpx-amber)]">{item.value}</span>
            </span>
          ))}
        </section>
      )}

      <section>
        <p className="section-kicker mb-1">Gestión</p>
        <h2 className="mb-4 text-xl font-semibold">Organizaciones</h2>

        {loading ? (
          <DashboardOrganizationsSkeleton />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {organizations.map((org) => (
              <OrganizationEditCard key={org.id} org={org} onSaved={() => void load()} />
            ))}
            <NewOrganizationCard onCreated={() => void load()} />
          </div>
        )}
      </section>
    </div>
  );
}
