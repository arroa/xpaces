import { redirect } from "next/navigation";

import { ViewerFloorsList } from "@/components/viewer-floors-list";
import { connectMongo } from "@/lib/mongodb";
import { isOrgAdmin, isSuperAdmin, isViewer } from "@/lib/roles";
import { requireCurrentXpacesUser } from "@/lib/xpaces-user";
import { listViewerAccessibleFloors, viewerNeedsFloorScope } from "@/lib/viewer-floor-access";
import { OrganizationModel, type OrganizationDocument } from "@/models/organization";

export default async function OrgPlantasPage() {
  const user = await requireCurrentXpacesUser();

  if (!isViewer(user.roles) || isOrgAdmin(user.roles) || isSuperAdmin(user.roles)) {
    redirect("/dashboard");
  }

  if (!user.organizationId) {
    redirect("/sin-acceso");
  }

  const floors = await listViewerAccessibleFloors(user.id, user.organizationId);
  if (viewerNeedsFloorScope(user) && floors.length === 0) {
    redirect("/org/sin-plantas");
  }

  await connectMongo();
  const organization = await OrganizationModel.findById(user.organizationId).lean<
    OrganizationDocument | null
  >();

  return <ViewerFloorsList floors={floors} organizationName={organization?.name} />;
}
