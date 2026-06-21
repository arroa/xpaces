import { canWriteOrg } from "@/lib/org-access";
import { connectMongo } from "@/lib/mongodb";
import { loadCatalogs, serializeRoom, serializeSeat } from "@/lib/seat-assignment";
import type { XpacesUser } from "@/lib/xpaces-user";
import { BuildingModel, type BuildingDocument } from "@/models/building";
import { FloorModel, type FloorDocument } from "@/models/floor";
import { RoomModel, type RoomDocument } from "@/models/room";
import { SeatModel, type SeatDocument } from "@/models/seat";

export type FloorLayoutData = {
  floor: {
    id: string;
    buildingId: string;
    name: string;
    imageUrl: string;
    totalSeats: number;
    totalRooms: number;
  };
  building: { id: string; name: string };
  seats: ReturnType<typeof serializeSeat>[];
  rooms: ReturnType<typeof serializeRoom>[];
  catalogs: Awaited<ReturnType<typeof loadCatalogs>>;
  canWrite: boolean;
};

export async function loadFloorLayoutData(
  organizationId: string,
  floorId: string,
  user: XpacesUser,
): Promise<FloorLayoutData | null> {
  await connectMongo();

  const floor = await FloorModel.findOne({
    _id: floorId,
    organizationId,
    active: true,
  }).lean<FloorDocument | null>();

  if (!floor) {
    return null;
  }

  const [building, seats, rooms, catalogs] = await Promise.all([
    BuildingModel.findById(floor.buildingId).lean<BuildingDocument | null>(),
    SeatModel.find({ floorId: floor._id }).sort({ code: 1 }).lean<SeatDocument[]>(),
    RoomModel.find({ floorId: floor._id }).sort({ code: 1 }).lean<RoomDocument[]>(),
    loadCatalogs(organizationId),
  ]);

  return {
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
    seats: seats.map(serializeSeat),
    rooms: rooms.map(serializeRoom),
    catalogs,
    canWrite: canWriteOrg(user),
  };
}
