import { redirect } from "next/navigation";

import { SeatsConsultation } from "@/components/seats-consultation";
import { connectMongo } from "@/lib/mongodb";
import { isOrgAdmin, isSuperAdmin, isViewer } from "@/lib/roles";
import { requireCurrentXpacesUser } from "@/lib/xpaces-user";
import { OrganizationModel, type OrganizationDocument } from "@/models/organization";

export default async function OrgConsultaPage() {
  const user = await requireCurrentXpacesUser();

  if (isSuperAdmin(user.roles) && !isOrgAdmin(user.roles)) {
    redirect("/dashboard");
  }

  if (isViewer(user.roles) && !isOrgAdmin(user.roles)) {
    redirect("/org/plantas");
  }

  if (!user.organizationId || !isOrgAdmin(user.roles)) {
    redirect("/dashboard");
  }

  await connectMongo();
  const organization = await OrganizationModel.findById(user.organizationId).lean<
    OrganizationDocument | null
  >();

  return (
    <SeatsConsultation
      organizationName={organization?.name}
      layoutBasePath="/org/floors"
    />
  );
}
