import { Skeleton } from "@/components/ui/skeleton";

export function BuildingsPageSkeleton() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </section>

      <section className="card-executive space-y-4 rounded-2xl p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full max-w-md rounded-xl" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </section>

      <section className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <article key={index} className="card-executive overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between gap-3 p-5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
            <div className="border-t border-[var(--border-strong)] p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-52 rounded-xl" />
                <Skeleton className="h-52 rounded-xl" />
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
