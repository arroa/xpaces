"use client";

import type { SignInResource } from "@clerk/types";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AuthEnteringOverlay } from "@/components/auth-entering-overlay";

type Step = "email" | "code";

type SignInFormInnerProps = {
  signIn: SignInResource;
  setActive: (params: { session: string | null }) => Promise<void>;
};

function normalizeIdentifier(email: string) {
  return email.trim().toLowerCase();
}

function SignInFormInner({ signIn, setActive }: SignInFormInnerProps) {
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [entering, setEntering] = useState(false);

  async function finishSignIn(sessionId: string) {
    setEntering(true);
    setLoading(true);
    await setActive({ session: sessionId });
    router.push("/dashboard");
  }

  async function clearClerkState() {
    if (isSignedIn || signIn.status) {
      await signOut();
    }
  }

  async function startSignIn(identifier: string, retry = false): Promise<SignInResource> {
    const normalized = normalizeIdentifier(identifier);

    if (
      signIn.status === "needs_first_factor" &&
      signIn.identifier?.toLowerCase() === normalized
    ) {
      return signIn;
    }

    if (!retry && (isSignedIn || signIn.status)) {
      await clearClerkState();
    }

    try {
      return await signIn.create({ identifier: normalized });
    } catch (err) {
      if (!retry && isClerkAPIResponseError(err)) {
        const clerkCode = err.errors[0]?.code;
        if (clerkCode === "session_exists" || err.status === 409) {
          await clearClerkState();
          return startSignIn(identifier, true);
        }
      }
      throw err;
    }
  }

  async function prepareEmailCode(result: SignInResource) {
    if (result.status === "complete" && result.createdSessionId) {
      await finishSignIn(result.createdSessionId);
      return true;
    }

    if (result.status !== "needs_first_factor") {
      setError("No se pudo iniciar el inicio de sesión. Intenta de nuevo.");
      return true;
    }

    const emailFactor = result.supportedFirstFactors?.find(
      (factor) => factor.strategy === "email_code",
    );

    if (!emailFactor || !("emailAddressId" in emailFactor)) {
      const hasPassword = result.supportedFirstFactors?.some(
        (factor) => factor.strategy === "password",
      );
      setError(
        hasPassword
          ? "Clerk tiene solo contraseña activa. En el dashboard activa Email verification code."
          : "El código por email no está habilitado en Clerk.",
      );
      return true;
    }

    await signIn.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: emailFactor.emailAddressId,
    });

    setStep("code");
    return true;
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const accessRes = await fetch("/api/auth/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const access = (await accessRes.json()) as { allowed?: boolean };
      if (!access.allowed) {
        setError("No tienes acceso a Xpaces. Contacta al administrador.");
        return;
      }

      const result = await startSignIn(email);
      await prepareEmailCode(result);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Error al iniciar sesión");
      } else {
        setError("Error inesperado. Intenta de nuevo.");
      }
    } finally {
      if (!entering) {
        setLoading(false);
      }
    }
  }

  async function handleCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code.trim(),
      });

      if (result.status === "complete" && result.createdSessionId) {
        await finishSignIn(result.createdSessionId);
        return;
      }

      setError("Código inválido o expirado.");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Código inválido");
      } else {
        setError("Error al verificar el código.");
      }
    } finally {
      if (!entering) {
        setLoading(false);
      }
    }
  }

  return (
    <>
      {entering && <AuthEnteringOverlay />}
      <div className="card-glass w-full max-w-md rounded-3xl p-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--besharpx-amber)]">
            Acceso restringido
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Entrar a Xpaces</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {step === "email" ? "Ingresa tu correo autorizado." : `Código enviado a ${email}`}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-[var(--muted)]">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl input-field px-4 py-3"
                placeholder="tu@empresa.com"
              />
            </label>
            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-amber w-full rounded-xl py-3 text-sm disabled:opacity-50"
            >
              {loading ? "Verificando…" : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-[var(--muted)]">Código de verificación</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="mt-1.5 w-full rounded-xl input-field px-4 py-3 text-center text-2xl tracking-[0.4em]"
                placeholder="000000"
              />
            </label>
            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="btn-amber w-full rounded-xl py-3 text-sm disabled:opacity-50"
            >
              {loading ? "Verificando…" : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
                void clearClerkState();
              }}
              className="w-full text-sm text-[var(--muted)] transition hover:text-[var(--besharpx-amber)]"
            >
              ← Usar otro email
            </button>
          </form>
        )}
      </div>
    </>
  );
}

function DevSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [entering, setEntering] = useState(false);

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const accessRes = await fetch("/api/auth/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const access = (await accessRes.json()) as { allowed?: boolean };
      if (!access.allowed) {
        setError("No tienes acceso a Xpaces. Contacta al administrador.");
        return;
      }

      const devRes = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!devRes.ok) {
        setError("No se pudo iniciar sesión en modo desarrollo.");
        return;
      }

      setEntering(true);
      router.push("/dashboard");
    } catch {
      setError("Error inesperado. Intenta de nuevo.");
    } finally {
      if (!entering) {
        setLoading(false);
      }
    }
  }

  return (
    <>
      {entering && <AuthEnteringOverlay />}
      <div className="card-glass w-full max-w-md rounded-3xl p-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--besharpx-amber)]">
            Acceso restringido
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Entrar a Xpaces</h1>
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            Modo desarrollo: sin OTP ni Clerk al entrar.
          </p>
        </div>
        <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-[var(--muted)]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl input-field px-4 py-3"
              placeholder="tu@empresa.com"
            />
          </label>
          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn-amber w-full rounded-xl py-3 text-sm disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </>
  );
}

function ClerkSignInForm() {
  const { signIn, isLoaded, setActive } = useSignIn();
  if (!isLoaded || !signIn || !setActive) {
    return (
      <div className="card-glass w-full max-w-md rounded-3xl p-8 text-center text-sm text-[var(--muted)]">
        Cargando…
      </div>
    );
  }
  return <SignInFormInner signIn={signIn} setActive={setActive} />;
}

type SignInFormProps = {
  devBypass?: boolean;
};

export function SignInForm({ devBypass = false }: SignInFormProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div className="card-glass w-full max-w-md rounded-3xl p-8 text-center text-sm text-[var(--muted)]">
        Cargando…
      </div>
    );
  }
  if (devBypass) {
    return <DevSignInForm />;
  }
  return <ClerkSignInForm />;
}
