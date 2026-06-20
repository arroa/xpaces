import { redirect } from "next/navigation";

import { AdminOrganizationsClient } from "@/components/admin-organizations-client";
import { isSuperAdmin } from "@/lib/roles";
import { requireCurrentXpacesUser } from "@/lib/xpaces-user";

export default async function AdminOrganizationsPage() {
  const user = await requireCurrentXpacesUser();
  if (!isSuperAdmin(user.roles)) {
    redirect("/dashboard");
  }

  return <AdminOrganizationsClient />;
}
