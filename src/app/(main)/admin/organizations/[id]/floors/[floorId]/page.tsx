import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string; floorId: string }>;
};

export default async function AdminOrganizationFloorManagePage({ params }: PageProps) {
  const { id, floorId } = await params;
  redirect(`/admin/organizations/${id}/floors/${floorId}/layout`);
}
