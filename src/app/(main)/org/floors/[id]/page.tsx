import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrgFloorManagePage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/org/floors/${id}/layout`);
}
