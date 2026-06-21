import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectMongo } from "@/lib/mongodb";
import { isOrgAdmin, isSuperAdmin, isViewer } from "@/lib/roles";
import type { XpacesUser } from "@/lib/xpaces-user";
import { BuildingModel, type BuildingDocument } from "@/models/building";
import { FloorModel, type FloorDocument } from "@/models/floor";
import { ViewerFloorAccessModel } from "@/models/viewer-floor-access";

export type FloorOption = {
  id: string;
  name: string;
  buildingId: string;
};

export type BuildingFloorOptions = {
  id: string;
  name: string;
  floors: FloorOption[];
};

export function viewerNeedsFloorScope(user: Pick<XpacesUser, "roles">): boolean {
  return isViewer(user.roles) && !isOrgAdmin(user.roles) && !isSuperAdmin(user.roles);
}

export function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
}

export async function getViewerFloorIds(userId: string, organizationId: string): Promise<string[]> {
  await connectMongo();
  const rows = await ViewerFloorAccessModel.find({ userId, organizationId }).lean();
  return rows.map((row) => String(row.floorId));
}

export type ViewerAccessibleFloor = {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  totalSeats: number;
  totalRooms: number;
};

export async function listViewerAccessibleFloors(
  userId: string,
  organizationId: string,
): Promise<ViewerAccessibleFloor[]> {
  const floorIds = await getViewerFloorIds(userId, organizationId);
  if (floorIds.length === 0) {
    return [];
  }

  await connectMongo();
  const floors = await FloorModel.find({
    _id: { $in: toObjectIds(floorIds) },
    organizationId,
    active: true,
  })
    .sort({ name: 1 })
    .lean<FloorDocument[]>();

  if (floors.length === 0) {
    return [];
  }

  const buildingIds = [...new Set(floors.map((floor) => String(floor.buildingId)))];
  const buildings = await BuildingModel.find({
    _id: { $in: toObjectIds(buildingIds) },
    organizationId,
    active: true,
  }).lean<BuildingDocument[]>();

  const buildingNameById = new Map(buildings.map((building) => [String(building._id), building.name]));

  return floors.map((floor) => ({
    id: String(floor._id),
    name: floor.name,
    buildingId: String(floor.buildingId),
    buildingName: buildingNameById.get(String(floor.buildingId)) ?? "Edificio",
    totalSeats: floor.totalSeats,
    totalRooms: floor.totalRooms,
  }));
}

export async function getViewerFloorIdsByUserIds(
  organizationId: string,
  userIds: string[],
): Promise<Map<string, string[]>> {
  if (userIds.length === 0) {
    return new Map();
  }

  await connectMongo();
  const rows = await ViewerFloorAccessModel.find({
    organizationId,
    userId: { $in: userIds },
  }).lean();

  const map = new Map<string, string[]>();
  for (const row of rows) {
    const key = String(row.userId);
    const list = map.get(key) ?? [];
    list.push(String(row.floorId));
    map.set(key, list);
  }
  return map;
}

export async function validateFloorIdsForOrganization(
  organizationId: string,
  floorIds: string[],
): Promise<{ ok: true; floorIds: string[] } | { ok: false; error: string }> {
  const unique = [...new Set(floorIds.filter(Boolean))];
  if (unique.length === 0) {
    return { ok: true, floorIds: [] };
  }

  await connectMongo();
  const validObjectIds = unique.filter((id) => Types.ObjectId.isValid(id));
  if (validObjectIds.length !== unique.length) {
    return { ok: false, error: "Planta inválida" };
  }

  const count = await FloorModel.countDocuments({
    _id: { $in: validObjectIds },
    organizationId,
    active: true,
  });

  if (count !== unique.length) {
    return { ok: false, error: "Una o más plantas no pertenecen a la organización" };
  }

  return { ok: true, floorIds: unique };
}

export async function syncViewerFloorAccess(
  userId: string,
  organizationId: string,
  floorIds: string[],
): Promise<void> {
  await connectMongo();
  const validation = await validateFloorIdsForOrganization(organizationId, floorIds);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  await ViewerFloorAccessModel.deleteMany({ userId, organizationId });

  if (validation.floorIds.length === 0) {
    return;
  }

  await ViewerFloorAccessModel.insertMany(
    validation.floorIds.map((floorId) => ({
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(userId),
      floorId: new Types.ObjectId(floorId),
    })),
  );
}

export async function viewerCanAccessFloor(
  user: Pick<XpacesUser, "id" | "roles">,
  organizationId: string,
  floorId: string,
): Promise<boolean> {
  if (!viewerNeedsFloorScope(user)) {
    return true;
  }

  await connectMongo();
  const row = await ViewerFloorAccessModel.findOne({
    userId: user.id,
    organizationId,
    floorId,
  }).lean();

  return Boolean(row);
}

export function viewerFloorAccessDeniedResponse() {
  return NextResponse.json({ error: "Sin acceso a esta planta" }, { status: 403 });
}

export async function assertViewerFloorAccess(
  user: XpacesUser,
  organizationId: string,
  floorId: string,
): Promise<NextResponse | null> {
  const allowed = await viewerCanAccessFloor(user, organizationId, floorId);
  if (!allowed) {
    return viewerFloorAccessDeniedResponse();
  }
  return null;
}

export async function loadBuildingFloorOptions(organizationId: string): Promise<BuildingFloorOptions[]> {
  await connectMongo();

  const buildings = await BuildingModel.find({ organizationId, active: true })
    .sort({ name: 1 })
    .lean<BuildingDocument[]>();

  if (buildings.length === 0) {
    return [];
  }

  const buildingIds = buildings.map((b) => b._id);
  const floors = await FloorModel.find({
    buildingId: { $in: buildingIds },
    organizationId,
    active: true,
  })
    .sort({ name: 1 })
    .lean<FloorDocument[]>();

  const floorsByBuilding = new Map<string, FloorOption[]>();
  for (const floor of floors) {
    const key = String(floor.buildingId);
    const list = floorsByBuilding.get(key) ?? [];
    list.push({
      id: String(floor._id),
      name: floor.name,
      buildingId: key,
    });
    floorsByBuilding.set(key, list);
  }

  return buildings.map((building) => ({
    id: String(building._id),
    name: building.name,
    floors: floorsByBuilding.get(String(building._id)) ?? [],
  }));
}

export async function filterFloorIdsForViewer(
  user: Pick<XpacesUser, "id" | "roles">,
  organizationId: string,
  floorIds: string[],
): Promise<string[]> {
  if (!viewerNeedsFloorScope(user)) {
    return floorIds;
  }

  const allowed = new Set(await getViewerFloorIds(user.id, organizationId));
  return floorIds.filter((id) => allowed.has(id));
}
