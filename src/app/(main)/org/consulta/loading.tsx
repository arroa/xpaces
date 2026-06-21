import { Skeleton } from "@/components/ui/skeleton";

export default function OrgConsultaLoading() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </section>
      <section className="card-executive space-y-4 rounded-2xl p-5">
        <Skeleton className="h-4 w-24" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-28" />
          ))}
        </div>
      </section>
      <section className="card-executive overflow-hidden rounded-2xl">
        <div className="border-b border-[var(--border-strong)] px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </section>
    </div>
  );
}
