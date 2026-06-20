import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { BrandLogo } from "@/components/brand-logo";
import { getCurrentXpacesUser } from "@/lib/xpaces-user";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) {
    const xpacesUser = await getCurrentXpacesUser();
    redirect(xpacesUser ? "/dashboard" : "/sin-acceso");
  }

  return (
    <div className="mesh-landing min-h-screen">
      <header className="border-b border-[var(--border)] px-4 py-6">
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
