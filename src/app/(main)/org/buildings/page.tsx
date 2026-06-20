import { redirect } from "next/navigation";

import { BuildingsManager } from "@/components/buildings-manager";
import { canWriteOrg } from "@/lib/org-access";
import { connectMongo } from "@/lib/mongodb";
import { isOrgAdmin, isSuperAdmin, isViewer } from "@/lib/roles";
import { requireCurrentXpacesUser } from "@/lib/xpaces-user";
import { OrganizationModel, type OrganizationDocument } from "@/models/organization";

export default async function OrgBuildingsPage() {
  const user = await requireCurrentXpacesUser();

  if (isSuperAdmin(user.roles) && !isOrgAdmin(user.roles)) {
    redirect("/dashboard");
  }

  if (!user.organizationId || (!isOrgAdmin(user.roles) && !isViewer(user.roles))) {
    redirect("/dashboard");
  }

  await connectMongo();
  const organization = await OrganizationModel.findById(user.organizationId).lean<
    OrganizationDocument | null
  >();

  return (
    <BuildingsManager
      canWrite={canWriteOrg(user)}
      organizationName={organization?.name}
    />
  );
}
