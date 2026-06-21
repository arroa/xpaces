import { NextResponse } from "next/server";

import { loadFloorReportOptions } from "@/lib/floor-report-options";
import { requireApiOrgAdminContext } from "@/lib/org-access";
import { connectMongo } from "@/lib/mongodb";

export async function GET(request: Request) {
  const authResult = await requireApiOrgAdminContext(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  await connectMongo();
  const buildings = await loadFloorReportOptions(authResult.organizationId);

  return NextResponse.json({ buildings });
}
