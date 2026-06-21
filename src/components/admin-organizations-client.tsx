"use client";

import { useCallback, useEffect, useState } from "react";

import { CreateOrganizationForm } from "@/components/create-organization-form";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  orgAdmin: { email: string; displayName: string } | null;
  stats?: { buildings: number; floors: number; viewers: number };
};

export function AdminOrganizationsClient() {
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/organizations");
    const data = (await res.json()) as { organizations?: OrganizationRow[] };
    setOrganizations(data.organizations ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Organizaciones</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Crea una organización y asigna su OrgAdmin.
        </p>
      </section>

      <CreateOrganizationForm onCreated={() => void load()} />

      <section className="card-executive rounded-2xl p-6">
        <h2 className="font-semibold">Activas</h2>
        {loading ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Cargando…</p>
        ) : organizations.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">Aún no hay organizaciones.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {organizations.map((org) => (
              <article
                key={org.id}
                className="surface-inset rounded-xl p-4"
              >
                <p className="font-medium">{org.name}</p>
                <p className="text-xs text-[var(--muted)]">{org.slug}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  OrgAdmin: {org.orgAdmin?.email ?? "—"}
                </p>
                {org.stats && (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {org.stats.buildings} edificios · {org.stats.floors} plantas ·{" "}
                    {org.stats.viewers} viewers
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
