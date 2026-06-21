import type { FloorLayoutData } from "@/lib/floor-layout-data";

export type FloorReportStats = {
  totalSeats: number;
  plantedSeats: number;
  utilizedSeats: number;
  availableSeats: number;
  totalRooms: number;
  plantedRooms: number;
};

type ReportSeat = FloorLayoutData["seats"][number];
type ReportRoom = FloorLayoutData["rooms"][number];

export function isSeatPlanted(seat: ReportSeat) {
  return seat.position != null;
}

export function isSeatUtilized(seat: ReportSeat) {
  return seat.estado === "ocupado" || Boolean(seat.persona.trim());
}

export function isRoomPlanted(room: ReportRoom) {
  return room.position != null;
}

export function computeFloorReportStats(data: FloorLayoutData): FloorReportStats {
  const totalSeats = data.seats.length;
  const plantedSeats = data.seats.filter(isSeatPlanted).length;
  const utilizedSeats = data.seats.filter(isSeatUtilized).length;
  const totalRooms = data.rooms.length;
  const plantedRooms = data.rooms.filter(isRoomPlanted).length;

  return {
    totalSeats,
    plantedSeats,
    utilizedSeats,
    availableSeats: totalSeats - utilizedSeats,
    totalRooms,
    plantedRooms,
  };
}

export function listUtilizedPlantedSeats(data: FloorLayoutData) {
  return data.seats
    .filter((seat) => isSeatPlanted(seat) && isSeatUtilized(seat))
    .sort((left, right) => left.code.localeCompare(right.code, "es", { numeric: true }));
}

export function listPlantedSeats(data: FloorLayoutData) {
  return data.seats.filter(isSeatPlanted);
}

export function listPlantedRooms(data: FloorLayoutData) {
  return data.rooms.filter(isRoomPlanted);
}
