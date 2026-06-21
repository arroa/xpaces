import "server-only";

import { Types } from "mongoose";

import { connectMongo } from "@/lib/mongodb";
import { BuildingModel, type BuildingDocument } from "@/models/building";
import { FloorModel, type FloorDocument } from "@/models/floor";
import { RoomModel } from "@/models/room";
import { SeatModel } from "@/models/seat";

export type FloorReportOption = {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  imageUrl: string;
  totalSeats: number;
  plantedSeats: number;
  utilizedSeats: number;
  availableSeats: number;
  totalRooms: number;
  plantedRooms: number;
  canGenerate: boolean;
};

export type FloorReportBuildingGroup = {
  id: string;
  name: string;
  floors: FloorReportOption[];
};

function plantedPositionExpression() {
  return {
    $and: [{ $ne: ["$position.x", null] }, { $ne: ["$position.y", null] }],
  };
}

function utilizedSeatExpression() {
  return {
    $or: [
      { $eq: ["$estado", "ocupado"] },
      { $gt: [{ $strLenCP: { $trim: { input: { $ifNull: ["$persona", ""] } } } }, 0] },
    ],
  };
}

export async function loadFloorReportOptions(
  organizationId: string,
): Promise<FloorReportBuildingGroup[]> {
  await connectMongo();
  const orgOid = new Types.ObjectId(organizationId);

  const buildings = await BuildingModel.find({ organizationId: orgOid, active: true })
    .sort({ name: 1 })
    .lean<BuildingDocument[]>();

  if (buildings.length === 0) {
    return [];
  }

  const buildingNameById = new Map(buildings.map((building) => [String(building._id), building.name]));
  const buildingIds = buildings.map((building) => building._id);

  const floors = await FloorModel.find({
    organizationId: orgOid,
    buildingId: { $in: buildingIds },
    active: true,
  })
    .sort({ name: 1 })
    .lean<FloorDocument[]>();

  if (floors.length === 0) {
    return buildings.map((building) => ({
      id: String(building._id),
      name: building.name,
      floors: [],
    }));
  }

  const floorIds = floors.map((floor) => floor._id);

  const [seatStats, roomStats] = await Promise.all([
    SeatModel.aggregate<{
      _id: typeof floorIds[number];
      totalSeats: number;
      plantedSeats: number;
      utilizedSeats: number;
    }>([
      { $match: { organizationId: orgOid, floorId: { $in: floorIds } } },
      {
        $group: {
          _id: "$floorId",
          totalSeats: { $sum: 1 },
          plantedSeats: {
            $sum: { $cond: [plantedPositionExpression(), 1, 0] },
          },
          utilizedSeats: {
            $sum: { $cond: [utilizedSeatExpression(), 1, 0] },
          },
        },
      },
    ]),
    RoomModel.aggregate<{
      _id: typeof floorIds[number];
      totalRooms: number;
      plantedRooms: number;
    }>([
      { $match: { organizationId: orgOid, floorId: { $in: floorIds } } },
      {
        $group: {
          _id: "$floorId",
          totalRooms: { $sum: 1 },
          plantedRooms: {
            $sum: { $cond: [plantedPositionExpression(), 1, 0] },
          },
        },
      },
    ]),
  ]);

  const seatStatsByFloor = new Map(seatStats.map((row) => [String(row._id), row]));
  const roomStatsByFloor = new Map(roomStats.map((row) => [String(row._id), row]));

  const floorsByBuilding = new Map<string, FloorReportOption[]>();

  for (const floor of floors) {
    const floorId = String(floor._id);
    const seatRow = seatStatsByFloor.get(floorId);
    const roomRow = roomStatsByFloor.get(floorId);
    const totalSeats = seatRow?.totalSeats ?? 0;
    const utilizedSeats = seatRow?.utilizedSeats ?? 0;

    const option: FloorReportOption = {
      id: floorId,
      name: floor.name,
      buildingId: String(floor.buildingId),
      buildingName: buildingNameById.get(String(floor.buildingId)) ?? "Edificio",
      imageUrl: floor.imageUrl ?? "",
      totalSeats,
      plantedSeats: seatRow?.plantedSeats ?? 0,
      utilizedSeats,
      availableSeats: totalSeats - utilizedSeats,
      totalRooms: roomRow?.totalRooms ?? 0,
      plantedRooms: roomRow?.plantedRooms ?? 0,
      canGenerate: Boolean(floor.imageUrl?.trim()) && (seatRow?.plantedSeats ?? 0) > 0,
    };

    const buildingFloors = floorsByBuilding.get(option.buildingId) ?? [];
    buildingFloors.push(option);
    floorsByBuilding.set(option.buildingId, buildingFloors);
  }

  return buildings.map((building) => ({
    id: String(building._id),
    name: building.name,
    floors: floorsByBuilding.get(String(building._id)) ?? [],
  }));
}
