import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mesh-landing flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] bg-[#0a0a0a]/80 px-4 py-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md justify-center">
          <BrandLogo href="/" />
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        {children}
      </main>
    </div>
  );
}
