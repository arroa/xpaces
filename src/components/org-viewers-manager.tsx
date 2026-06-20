"use client";

import { useCallback, useEffect, useState } from "react";

import { withOrgContext } from "@/lib/org-api-client";

type ViewerRow = {
  id: string;
  email: string;
  displayName: string;
};

type OrgViewersManagerProps = {
  organizationId?: string;
};

export function OrgViewersManager({ organizationId }: OrgViewersManagerProps) {
  const [viewers, setViewers] = useState<ViewerRow[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/viewers", withOrgContext(organizationId));
    const data = (await res.json()) as { viewers?: ViewerRow[] };
    setViewers(data.viewers ?? []);
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        "/api/viewers",
        withOrgContext(organizationId, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, displayName }),
        }),
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el viewer");
        return;
      }
      setEmail("");
      setDisplayName("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Viewers</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Usuarios de solo lectura dentro de la organización.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="card-executive space-y-4 rounded-2xl p-6">
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-elevated)] px-4 py-2.5"
          />
        </label>
        <label className="block">
          <span className="text-xs text-[var(--muted)]">Nombre (opcional)</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-elevated)] px-4 py-2.5"
          />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={loading} className="btn-amber rounded-xl px-4 py-2 text-sm">
          {loading ? "Creando…" : "Agregar viewer"}
        </button>
      </form>

      <section className="card-executive rounded-2xl p-6">
        <ul className="divide-y divide-[var(--border)]">
          {viewers.map((viewer) => (
            <li key={viewer.id} className="py-3">
              <p className="font-medium">{viewer.email}</p>
              {viewer.displayName && (
                <p className="text-sm text-[var(--muted)]">{viewer.displayName}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
