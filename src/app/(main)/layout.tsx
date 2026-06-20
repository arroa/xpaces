import { AppHeader } from "@/components/app-header";
import { AppProviders } from "@/components/app-providers";
import { requireCurrentXpacesUser } from "@/lib/xpaces-user";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentXpacesUser();

  return (
    <AppProviders>
      <div className="mesh-landing flex min-h-dvh flex-col">
        <AppHeader user={user} />
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-2">{children}</main>
      </div>
    </AppProviders>
  );
}
