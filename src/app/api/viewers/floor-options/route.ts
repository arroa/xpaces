import { NextResponse } from "next/server";

import { requireApiOrgAdminContext } from "@/lib/org-access";import { loadBuildingFloorOptions } from "@/lib/viewer-floor-access";

export async function GET(request: Request) {
  const authResult = await requireApiOrgAdminContext(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const buildings = await loadBuildingFloorOptions(authResult.organizationId);
  return NextResponse.json({ buildings });
}
