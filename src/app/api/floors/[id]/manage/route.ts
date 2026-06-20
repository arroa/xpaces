import { NextResponse } from "next/server";

import { canWriteOrg, requireApiOrgMember } from "@/lib/org-access";
import { serializeRoom } from "@/lib/seat-assignment";
import { connectMongo } from "@/lib/mongodb";
import { BuildingModel, type BuildingDocument } from "@/models/building";
import { FloorModel, type FloorDocument } from "@/models/floor";
import { RoomModel, type RoomDocument } from "@/models/room";
import { SeatModel } from "@/models/seat";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMember(request);
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

  const building = await BuildingModel.findById(floor.buildingId).lean<BuildingDocument | null>();
  const [rooms, assignedSeats] = await Promise.all([
    RoomModel.find({ floorId: floor._id }).sort({ code: 1 }).lean<RoomDocument[]>(),
    SeatModel.countDocuments({
      floorId: floor._id,
      persona: { $nin: ["", null] },
    }),
  ]);

  return NextResponse.json({
    floor: {
      id: String(floor._id),
      buildingId: String(floor.buildingId),
      name: floor.name,
      imageUrl: floor.imageUrl,
      totalSeats: floor.totalSeats,
      totalRooms: floor.totalRooms,
    },
    building: building
      ? { id: String(building._id), name: building.name }
      : { id: String(floor.buildingId), name: "Edificio" },
    rooms: rooms.map(serializeRoom),
    assignedSeats,
    canWrite: canWriteOrg(authResult.user),
  });
}
