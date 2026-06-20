import { NextResponse } from "next/server";

import { getFloorDeletionSummary } from "@/lib/floor-deletion";
import { requireApiOrgMemberWrite } from "@/lib/org-access";
import { connectMongo } from "@/lib/mongodb";
import { FloorModel, type FloorDocument } from "@/models/floor";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMemberWrite(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  await connectMongo();

  const floor = await FloorModel.findOne({
    _id: id,
    organizationId: authResult.organizationId,
    active: true,
  }).lean<FloorDocument | null>();

  if (!floor) {
    return NextResponse.json({ error: "Planta no encontrada" }, { status: 404 });
  }

  const summary = await getFloorDeletionSummary(floor._id);

  return NextResponse.json({
    floorName: floor.name,
    ...summary,
  });
}
