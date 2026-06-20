import Link from "next/link";

type BrandLogoProps = {
  href?: string | null;
};

export function BrandLogo({ href = "/" }: BrandLogoProps) {
  const content = (
    <div className="leading-tight">
      <span className="block text-lg font-bold tracking-tight text-[var(--besharpx-amber)]">
        BeSharpX
      </span>
      <span className="block text-xs font-medium tracking-widest text-[var(--muted)] uppercase">
        Xpaces
      </span>
    </div>
  );

  if (href == null) {
    return content;
  }

  return (
    <Link href={href} prefetch={false} className="transition opacity-90 hover:opacity-100">
      {content}
    </Link>
  );
}
