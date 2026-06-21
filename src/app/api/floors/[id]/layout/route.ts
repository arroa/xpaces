import { NextResponse } from "next/server";

import { loadFloorLayoutData } from "@/lib/floor-layout-data";
import { assertViewerFloorAccess } from "@/lib/viewer-floor-access";
import { requireApiOrgMember } from "@/lib/org-access";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMember(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const accessError = await assertViewerFloorAccess(authResult.user, authResult.organizationId, id);
  if (accessError) {
    return accessError;
  }

  const data = await loadFloorLayoutData(authResult.organizationId, id, authResult.user);

  if (!data) {
    return NextResponse.json({ error: "Planta no encontrada" }, { status: 404 });
  }

  return NextResponse.json(data);
}
