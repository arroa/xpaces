import { notFound, redirect } from "next/navigation";

import { BuildingsManager } from "@/components/buildings-manager";
import { connectMongo } from "@/lib/mongodb";
import { isSuperAdmin } from "@/lib/roles";
import { requireCurrentXpacesUser } from "@/lib/xpaces-user";
import { OrganizationModel, type OrganizationDocument } from "@/models/organization";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrganizationBuildingsPage({ params }: PageProps) {
  const user = await requireCurrentXpacesUser();
  if (!isSuperAdmin(user.roles)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  await connectMongo();
  const organization = await OrganizationModel.findOne({ _id: id, active: true }).lean<
    OrganizationDocument | null
  >();
  if (!organization) {
    notFound();
  }

  return (
    <BuildingsManager
      canWrite
      organizationId={id}
      organizationName={organization.name}
      backHref="/dashboard"
      layoutBasePath={`/admin/organizations/${id}/floors`}
    />
  );
}
