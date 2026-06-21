"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LoadingOverlay } from "@/components/loading-overlay";

type LoadingLinkProps = {
  href: string;
  message?: string;
  className?: string;
  children: React.ReactNode;
};

export function LoadingLink({
  href,
  message = "Cargando…",
  className,
  children,
}: LoadingLinkProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    setNavigating(true);
    router.push(href);
  }

  return (
    <>
      <LoadingOverlay visible={navigating} message={message} />
      <Link href={href} onClick={handleClick} className={className}>
        {children}
      </Link>
    </>
  );
}
