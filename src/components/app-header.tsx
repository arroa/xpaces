"use client";

import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { usePageHeaderTitleValue } from "@/components/page-header-title";
import { UserMenu } from "@/components/user-menu";
import { isOrgAdmin, isSuperAdmin, isViewer } from "@/lib/roles";
import type { XpacesUser } from "@/lib/xpaces-user";

type AppHeaderProps = {
  user: XpacesUser;
};

export function AppHeader({ user }: AppHeaderProps) {
  const pageTitle = usePageHeaderTitleValue();
  const isViewerOnly =
    isViewer(user.roles) && !isOrgAdmin(user.roles) && !isSuperAdmin(user.roles);
  const homeHref = isViewerOnly ? "/org/plantas" : "/dashboard";

  const links = isViewerOnly
    ? [{ href: "/org/plantas", label: "Plantas" }]
    : [{ href: "/dashboard", label: "Panel" }];

  if (isSuperAdmin(user.roles)) {
    links.push({ href: "/admin/organizations", label: "Organizaciones" });
  }

  if (isOrgAdmin(user.roles)) {
    links.push({ href: "/org/buildings", label: "Edificios" });
    links.push({ href: "/org/viewers", label: "Viewers" });
  }

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-[var(--border)] bg-[#0a0a0a]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-8">
          <BrandLogo href={homeHref} />
          <nav className="hidden gap-5 text-sm sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[var(--muted)] transition hover:text-[var(--besharpx-amber)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex min-w-0 items-center gap-4">
          {pageTitle && (
            <p className="hidden truncate text-sm font-semibold tracking-tight text-[var(--foreground)] sm:block">
              {pageTitle}
            </p>
          )}
          <UserMenu email={user.email} roles={user.roles} />
        </div>
      </div>
    </header>
  );
}
