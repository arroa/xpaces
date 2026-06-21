import { notFound, redirect } from "next/navigation";

import { FloorLayoutEditor } from "@/components/floor-layout-editor";
import { loadFloorLayoutData } from "@/lib/floor-layout-data";
import { isOrgAdmin, isSuperAdmin, isViewer } from "@/lib/roles";
import { requireCurrentXpacesUser } from "@/lib/xpaces-user";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FloorLayoutPage({ params }: PageProps) {
  const user = await requireCurrentXpacesUser();
  const { id } = await params;

  if (isSuperAdmin(user.roles) && !isOrgAdmin(user.roles)) {
    redirect("/dashboard");
  }

  if (!user.organizationId || (!isOrgAdmin(user.roles) && !isViewer(user.roles))) {
    redirect("/dashboard");
  }

  const initialData = await loadFloorLayoutData(user.organizationId, id, user);
  if (!initialData) {
    notFound();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FloorLayoutEditor floorId={id} initialData={initialData} />
    </div>
  );
}
