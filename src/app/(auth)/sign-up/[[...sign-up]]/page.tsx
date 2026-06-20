import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="card-glass w-full max-w-md rounded-3xl p-8 text-center">
      <h1 className="text-2xl font-bold">Registro cerrado</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        Los usuarios los crea un administrador. Si necesitas acceso, contacta a tu OrgAdmin.
      </p>
      <Link href="/sign-in" className="btn-amber mt-8 inline-block rounded-xl px-6 py-3 text-sm">
        Ir a iniciar sesión
      </Link>
    </div>
  );
}
