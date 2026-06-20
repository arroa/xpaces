import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Lexend } from "next/font/google";

import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Xpaces",
  description: "Organización de equipos en plantas de edificios — BeSharpX",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <html lang="es" className={lexend.className}>
        <body className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-8 text-[#f0f0f0]">
          <div className="max-w-md rounded-xl border border-amber-500/30 bg-[#141414] p-6 text-sm">
            <p className="font-semibold text-amber-400">Falta configurar Clerk</p>
            <p className="mt-2 text-[#9ca3af]">
              Agrega <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> y{" "}
              <code>CLERK_SECRET_KEY</code> en <code>.env.local</code>.
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="es" className={lexend.className}>
        <body className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0] antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
