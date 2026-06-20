import { Skeleton } from "@/components/ui/skeleton";

export function DashboardOrganizationsSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <article key={index} className="card-executive space-y-4 rounded-2xl p-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-3 w-40" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </article>
      ))}
      <article className="card-executive flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] p-6">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="mt-4 h-5 w-44" />
      </article>
    </div>
  );
}
