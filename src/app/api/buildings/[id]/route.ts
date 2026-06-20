import { NextResponse } from "next/server";
import { z } from "zod";

import { cascadeDeleteFloorData } from "@/lib/floor-deletion";
import { requireApiOrgMember, requireApiOrgMemberWrite } from "@/lib/org-access";
import { serializeBuilding } from "@/lib/floor-spaces";
import { connectMongo } from "@/lib/mongodb";
import { BuildingModel, type BuildingDocument } from "@/models/building";
import { FloorModel, type FloorDocument } from "@/models/floor";

const updateSchema = z.object({
  name: z.string().min(2).max(120),
});

type RouteContext = { params: Promise<{ id: string }> };

async function getBuildingForOrg(id: string, organizationId: string) {
  await connectMongo();
  return BuildingModel.findOne({ _id: id, organizationId, active: true }).lean<BuildingDocument | null>();
}

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMember(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const building = await getBuildingForOrg(id, authResult.organizationId);
  if (!building) {
    return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });
  }

  const floorCount = await FloorModel.countDocuments({ buildingId: building._id, active: true });

  return NextResponse.json({
    building: serializeBuilding({ ...building, floorCount }),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMemberWrite(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  await connectMongo();
  const building = await BuildingModel.findOneAndUpdate(
    { _id: id, organizationId: authResult.organizationId, active: true },
    { name: parsed.data.name.trim() },
    { new: true },
  ).lean<BuildingDocument | null>();

  if (!building) {
    return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });
  }

  const floorCount = await FloorModel.countDocuments({ buildingId: building._id, active: true });

  return NextResponse.json({
    building: serializeBuilding({ ...building, floorCount }),
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMemberWrite(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  await connectMongo();

  const building = await BuildingModel.findOne({
    _id: id,
    organizationId: authResult.organizationId,
    active: true,
  });

  if (!building) {
    return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });
  }

  const floors = await FloorModel.find({ buildingId: building._id, active: true }).lean<
    FloorDocument[]
  >();
  for (const floor of floors) {
    await cascadeDeleteFloorData(floor);
  }

  await FloorModel.updateMany({ buildingId: building._id }, { active: false });
  building.active = false;
  await building.save();

  return NextResponse.json({ ok: true });
}
