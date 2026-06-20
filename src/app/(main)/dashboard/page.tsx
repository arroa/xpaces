import Link from "next/link";

import { SuperAdminDashboard } from "@/components/super-admin-dashboard";
import { isOrgAdmin, isSuperAdmin, isViewer, roleLabel } from "@/lib/roles";
import { requireCurrentXpacesUser } from "@/lib/xpaces-user";

export default async function DashboardPage() {
  const user = await requireCurrentXpacesUser();

  if (isSuperAdmin(user.roles)) {
    return <SuperAdminDashboard />;
  }

  return (
    <div className="space-y-6">
      <section className="card-executive rounded-2xl p-8">
        <p className="text-sm font-medium text-[var(--besharpx-amber)]">Panel</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Xpaces</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {user.email} · {roleLabel(user.roles)}
        </p>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Gestión visual de puestos y salas sobre plantas de edificio.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {isOrgAdmin(user.roles) && (
            <>
              <Link href="/org/buildings" className="btn-amber rounded-xl px-4 py-2 text-sm">
                Edificios y plantas
              </Link>
              <Link href="/org/viewers" className="btn-outline-amber rounded-xl px-4 py-2 text-sm">
                Viewers
              </Link>
            </>
          )}
          {isViewer(user.roles) && (
            <Link href="/org/buildings" className="btn-outline-amber rounded-xl px-4 py-2 text-sm">
              Ver plantas
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
