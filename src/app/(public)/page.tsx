import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { isOrgAdmin, isViewer } from "@/lib/roles";
import { getCurrentXpacesUser } from "@/lib/xpaces-user";
import { listViewerAccessibleFloors, viewerNeedsFloorScope } from "@/lib/viewer-floor-access";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    const xpacesUser = await getCurrentXpacesUser();
    if (!xpacesUser) {
      redirect("/sin-acceso");
    }
    if (isViewer(xpacesUser.roles) && !isOrgAdmin(xpacesUser.roles) && xpacesUser.organizationId) {
      const floors = await listViewerAccessibleFloors(xpacesUser.id, xpacesUser.organizationId);
      if (viewerNeedsFloorScope(xpacesUser) && floors.length === 0) {
        redirect("/org/sin-plantas");
      }
      redirect("/org/plantas");
    }
    redirect("/dashboard");
  }

  return (
    <div className="mesh-landing min-h-screen">
      <header className="border-b border-[var(--border-strong)] px-4 py-6">
        <div className="mx-auto flex max-w-6xl justify-center">
          <BrandLogo href="/" />
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Organiza equipos en{" "}
          <span className="text-gradient-brand">plantas de edificio</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--muted)]">
          Sube la planta, coloca puestos y salas, asigna personas y exporta a Excel o PDF.
        </p>
        <div className="mt-10">
          <Link href="/sign-in" className="btn-amber inline-block rounded-2xl px-8 py-4 text-base">
            Entrar a Xpaces
          </Link>
        </div>
      </section>
    </div>
  );
}
