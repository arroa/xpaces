import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-[var(--card-elevated)] ${className}`.trim()}
      aria-hidden="true"
      {...props}
    />
  );
}
