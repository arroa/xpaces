"use client";

import { useState } from "react";

type CreateOrganizationFormProps = {
  onCreated: () => void;
};

export function CreateOrganizationForm({ onCreated }: CreateOrganizationFormProps) {
  const [name, setName] = useState("");
  const [orgAdminEmail, setOrgAdminEmail] = useState("");
  const [orgAdminDisplayName, setOrgAdminDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, orgAdminEmail, orgAdminDisplayName }),
      });
      const data = (await res.json()) as { error?: string; organization?: { name: string } };
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la organización");
        return;
      }
      setSuccess(`Organización "${data.organization?.name}" creada.`);
      setName("");
      setOrgAdminEmail("");
      setOrgAdminDisplayName("");
      onCreated();
    } catch {
      setError("Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-executive space-y-4 rounded-2xl p-6">
      <h2 className="text-lg font-semibold">Nueva organización</h2>
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
      <label className="block">
        <span className="text-xs text-[var(--muted)]">Nombre OrgAdmin (opcional)</span>
        <input
          value={orgAdminDisplayName}
          onChange={(e) => setOrgAdminDisplayName(e.target.value)}
          className="mt-1 w-full rounded-xl input-field px-4 py-2.5"
        />
      </label>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {success && <p className="text-sm text-emerald-300">{success}</p>}
      <button type="submit" disabled={loading} className="btn-amber rounded-xl px-4 py-2 text-sm">
        {loading ? "Creando…" : "Crear organización"}
      </button>
    </form>
  );
}
