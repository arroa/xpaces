import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { connectMongo } from "@/lib/mongodb";
import { isSuperAdmin } from "@/lib/roles";
import { requireCurrentXpacesUser } from "@/lib/xpaces-user";
import { OrganizationModel, type OrganizationDocument } from "@/models/organization";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrganizationPage({ params }: PageProps) {
  const user = await requireCurrentXpacesUser();
  if (!isSuperAdmin(user.roles)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  await connectMongo();
  const organization = await OrganizationModel.findOne({ _id: id, active: true }).lean<
    OrganizationDocument | null
  >();
  if (!organization) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="card-executive rounded-2xl px-8 py-5">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--muted)] hover:text-[var(--besharpx-amber)]"
        >
          ← Panel maestro
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{organization.name}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{organization.slug}</p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href={`/admin/organizations/${id}/buildings`}
          className="btn-amber rounded-xl px-4 py-2 text-sm"
        >
          Edificios y plantas
        </Link>
        <Link
          href={`/admin/organizations/${id}/viewers`}
          className="btn-outline-amber rounded-xl px-4 py-2 text-sm"
        >
          Viewers
        </Link>
      </section>
    </div>
  );
}
