import { Types } from "mongoose";

import { formatRoomCode, formatSeatCode } from "@/lib/cloudinary";
import { RoomModel } from "@/models/room";
import { SeatModel } from "@/models/seat";

export async function provisionFloorSpaces(params: {
  organizationId: Types.ObjectId;
  floorId: Types.ObjectId;
  totalSeats: number;
  totalRooms: number;
}) {
  const { organizationId, floorId, totalSeats, totalRooms } = params;

  const seats = Array.from({ length: totalSeats }, (_, index) => ({
    organizationId,
    floorId,
    code: formatSeatCode(index + 1),
    position: { x: null, y: null },
    grupo: "",
    equipo: "",
    empresa: "",
    persona: "",
    estado: "disponible" as const,
  }));

  const rooms = Array.from({ length: totalRooms }, (_, index) => ({
    organizationId,
    floorId,
    code: formatRoomCode(index + 1),
    position: { x: null, y: null },
    capacidad: 1,
    medios: false,
  }));

  if (seats.length > 0) {
    await SeatModel.insertMany(seats);
  }
  if (rooms.length > 0) {
    await RoomModel.insertMany(rooms);
  }
}

export async function replaceFloorSpaces(params: {
  organizationId: Types.ObjectId;
  floorId: Types.ObjectId;
  totalSeats: number;
  totalRooms: number;
}) {
  await SeatModel.deleteMany({ floorId: params.floorId });
  await RoomModel.deleteMany({ floorId: params.floorId });
  await provisionFloorSpaces(params);
}

export function serializeFloor(floor: {
  _id: Types.ObjectId;
  buildingId: Types.ObjectId;
  name: string;
  imageUrl: string;
  totalSeats: number;
  totalRooms: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: String(floor._id),
    buildingId: String(floor.buildingId),
    name: floor.name,
    imageUrl: floor.imageUrl,
    totalSeats: floor.totalSeats,
    totalRooms: floor.totalRooms,
    active: floor.active,
    createdAt: floor.createdAt.toISOString(),
    updatedAt: floor.updatedAt.toISOString(),
  };
}

export function serializeBuilding(building: {
  _id: Types.ObjectId;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  floorCount?: number;
}) {
  return {
    id: String(building._id),
    name: building.name,
    active: building.active,
    floorCount: building.floorCount ?? 0,
    createdAt: building.createdAt.toISOString(),
    updatedAt: building.updatedAt.toISOString(),
  };
}
