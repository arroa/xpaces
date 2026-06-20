import { DashboardOrganizationsSkeleton } from "@/components/dashboard-organizations-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <section className="card-executive rounded-2xl px-8 py-5">
        <Skeleton className="h-8 w-56" />
      </section>
      <section className="flex flex-wrap gap-x-5 gap-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-28" />
        ))}
      </section>
      <section>
        <Skeleton className="mb-4 h-7 w-40" />
        <DashboardOrganizationsSkeleton />
      </section>
    </div>
  );
}
