import { notFound, redirect } from "next/navigation";

import { FloorLayoutEditor } from "@/components/floor-layout-editor";
import { connectMongo } from "@/lib/mongodb";
import { isSuperAdmin } from "@/lib/roles";
import { requireCurrentXpacesUser } from "@/lib/xpaces-user";
import { OrganizationModel, type OrganizationDocument } from "@/models/organization";

type PageProps = {
  params: Promise<{ id: string; floorId: string }>;
};

export default async function AdminOrganizationFloorLayoutPage({ params }: PageProps) {
  const user = await requireCurrentXpacesUser();
  if (!isSuperAdmin(user.roles)) {
    redirect("/dashboard");
  }

  const { id, floorId } = await params;
  await connectMongo();
  const organization = await OrganizationModel.findOne({ _id: id, active: true }).lean<
    OrganizationDocument | null
  >();
  if (!organization) {
    notFound();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <FloorLayoutEditor floorId={floorId} organizationId={id} />
    </div>
  );
}
