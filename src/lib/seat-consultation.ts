import "server-only";

import { Types } from "mongoose";

import { loadCatalogs } from "@/lib/seat-assignment";
import {
  type SeatSearchFilters,
  type SeatSearchOptions,
  type SeatSearchRow,
} from "@/lib/seat-consultation-shared";
import { BuildingModel, type BuildingDocument } from "@/models/building";
import { FloorModel, type FloorDocument } from "@/models/floor";
import { SeatModel } from "@/models/seat";

export type { SeatSearchFilters, SeatSearchOptions, SeatSearchRow } from "@/lib/seat-consultation-shared";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compareFloorThenPuesto(left: SeatSearchRow, right: SeatSearchRow) {
  const floorCmp = left.floorName.localeCompare(right.floorName, "es");
  if (floorCmp !== 0) {
    return floorCmp;
  }
  return left.puesto.localeCompare(right.puesto, "es", { numeric: true });
}

export async function loadSeatSearchOptions(organizationId: string): Promise<SeatSearchOptions> {
  const orgOid = new Types.ObjectId(organizationId);
  const [buildings, floors, catalogs] = await Promise.all([
    BuildingModel.find({ organizationId: orgOid, active: true }).sort({ name: 1 }).lean(),
    FloorModel.find({ organizationId: orgOid, active: true }).sort({ name: 1 }).lean(),
    loadCatalogs(organizationId),
  ]);

  return {
    buildings: buildings.map((building) => ({
      id: String(building._id),
      name: building.name,
    })),
    floors: floors.map((floor) => ({
      id: String(floor._id),
      name: floor.name,
      buildingId: String(floor.buildingId),
    })),
    catalogs,
  };
}

export async function searchSeats(
  organizationId: string,
  filters: SeatSearchFilters,
): Promise<SeatSearchRow[]> {
  const buildingId = filters.buildingId?.trim();
  if (!buildingId) {
    return [];
  }

  const orgOid = new Types.ObjectId(organizationId);
  const buildingOid = new Types.ObjectId(buildingId);

  const [building, floors] = await Promise.all([
    BuildingModel.findOne({ _id: buildingOid, organizationId: orgOid, active: true }).lean<
      BuildingDocument | null
    >(),
    FloorModel.find({ organizationId: orgOid, buildingId: buildingOid, active: true })
      .sort({ name: 1 })
      .lean<FloorDocument[]>(),
  ]);

  if (!building || floors.length === 0) {
    return [];
  }

  const floorById = new Map(floors.map((floor) => [String(floor._id), floor]));
  let floorIds = floors.map((floor) => floor._id as Types.ObjectId);

  if (filters.floorId?.trim()) {
    const floorOid = filters.floorId.trim();
    if (!floorById.has(floorOid)) {
      return [];
    }
    floorIds = [new Types.ObjectId(floorOid)];
  }

  const seatQuery: Record<string, unknown> = {
    organizationId: orgOid,
    floorId: { $in: floorIds },
  };

  if (filters.grupo?.trim()) {
    seatQuery.grupo = filters.grupo.trim();
  }
  if (filters.equipo?.trim()) {
    seatQuery.equipo = filters.equipo.trim();
  }
  if (filters.empresa?.trim()) {
    seatQuery.empresa = filters.empresa.trim();
  }
  if (filters.persona?.trim()) {
    seatQuery.persona = { $regex: escapeRegex(filters.persona.trim()), $options: "i" };
  }

  const seats = await SeatModel.find(seatQuery).lean();
  const buildingName = building.name;

  const rows: SeatSearchRow[] = seats
    .map((seat) => {
      const floor = floorById.get(String(seat.floorId));
      if (!floor) {
        return null;
      }

      return {
        id: String(seat._id),
        persona: seat.persona,
        grupo: seat.grupo,
        equipo: seat.equipo,
        empresa: seat.empresa,
        puesto: seat.code,
        floorId: String(floor._id),
        floorName: floor.name,
        buildingId,
        buildingName,
        estado: seat.estado,
      };
    })
    .filter((row): row is SeatSearchRow => row !== null);

  rows.sort(compareFloorThenPuesto);
  return rows;
}
