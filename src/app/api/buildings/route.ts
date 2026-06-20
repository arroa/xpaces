import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiOrgMember, requireApiOrgMemberWrite } from "@/lib/org-access";
import { isOrgAdmin, isSuperAdmin } from "@/lib/roles";
import { serializeBuilding } from "@/lib/floor-spaces";
import { connectMongo } from "@/lib/mongodb";
import { BuildingModel, type BuildingDocument } from "@/models/building";
import { FloorModel } from "@/models/floor";

const createSchema = z.object({
  name: z.string().min(2).max(120),
});

export async function GET(request: Request) {
  const authResult = await requireApiOrgMember(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  await connectMongo();
  const { organizationId } = authResult;

  const buildings = await BuildingModel.find({ organizationId, active: true })
    .sort({ name: 1 })
    .lean<BuildingDocument[]>();

  const buildingIds = buildings.map((b) => b._id);
  const floorCounts = await FloorModel.aggregate<{ _id: unknown; count: number }>([
    { $match: { buildingId: { $in: buildingIds }, active: true } },
    { $group: { _id: "$buildingId", count: { $sum: 1 } } },
  ]);

  const countByBuilding = new Map(floorCounts.map((row) => [String(row._id), row.count]));

  return NextResponse.json({
    buildings: buildings.map((building) =>
      serializeBuilding({
        ...building,
        floorCount: countByBuilding.get(String(building._id)) ?? 0,
      }),
    ),
    canWrite: isOrgAdmin(authResult.user.roles) || isSuperAdmin(authResult.user.roles),
  });
}

export async function POST(request: Request) {
  const authResult = await requireApiOrgMemberWrite(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  await connectMongo();
  const building = await BuildingModel.create({
    organizationId: authResult.organizationId,
    name: parsed.data.name.trim(),
    active: true,
  });

  return NextResponse.json({
    building: serializeBuilding({ ...building.toObject(), floorCount: 0 }),
  });
}
