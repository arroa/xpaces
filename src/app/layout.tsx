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
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
  themeColor: "#050506",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <html lang="es" className={lexend.className}>
        <body className="flex min-h-screen items-center justify-center bg-[var(--background)] p-8 text-[var(--foreground)]">
          <div className="card-executive max-w-md rounded-xl p-6 text-sm">
            <p className="font-semibold text-[var(--besharpx-amber)]">Falta configurar Clerk</p>
            <p className="mt-2 text-[var(--muted)]">
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
        <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
