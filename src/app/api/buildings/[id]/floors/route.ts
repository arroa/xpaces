import { NextResponse } from "next/server";
import { z } from "zod";

import { uploadFloorImage } from "@/lib/cloudinary-upload";
import { FLOOR_MAX_ROOMS, FLOOR_MAX_SEATS } from "@/lib/floor-limits";
import { requireApiOrgMember, requireApiOrgMemberWrite } from "@/lib/org-access";
import { provisionFloorSpaces, serializeFloor } from "@/lib/floor-spaces";
import { connectMongo } from "@/lib/mongodb";
import {
  getViewerFloorIds,
  viewerNeedsFloorScope,
} from "@/lib/viewer-floor-access";
import { BuildingModel } from "@/models/building";
import { FloorModel, type FloorDocument } from "@/models/floor";
import { SeatModel } from "@/models/seat";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  totalSeats: z.number().int().min(1).max(FLOOR_MAX_SEATS),
  totalRooms: z.number().int().min(0).max(FLOOR_MAX_ROOMS),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMember(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id: buildingId } = await context.params;
  await connectMongo();

  const building = await BuildingModel.findOne({
    _id: buildingId,
    organizationId: authResult.organizationId,
    active: true,
  }).lean();

  if (!building) {
    return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });
  }

  const floors = await FloorModel.find({ buildingId, active: true })
    .sort({ name: 1 })
    .lean<FloorDocument[]>();

  let visibleFloors = floors;
  if (viewerNeedsFloorScope(authResult.user)) {
    const allowed = new Set(await getViewerFloorIds(authResult.user.id, authResult.organizationId));
    visibleFloors = floors.filter((floor) => allowed.has(String(floor._id)));
  }

  const floorIds = visibleFloors.map((floor) => floor._id);
  const assignedCounts =
    floorIds.length > 0
      ? await SeatModel.aggregate<{ _id: typeof floorIds[number]; assignedSeats: number }>([
          {
            $match: {
              floorId: { $in: floorIds },
              persona: { $nin: ["", null] },
            },
          },
          { $group: { _id: "$floorId", assignedSeats: { $sum: 1 } } },
        ])
      : [];
  const assignedByFloorId = new Map(
    assignedCounts.map((row) => [String(row._id), row.assignedSeats]),
  );

  return NextResponse.json({
    floors: visibleFloors.map((floor) => ({
      ...serializeFloor(floor),
      assignedSeats: assignedByFloorId.get(String(floor._id)) ?? 0,
    })),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMemberWrite(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id: buildingId } = await context.params;
  await connectMongo();

  const building = await BuildingModel.findOne({
    _id: buildingId,
    organizationId: authResult.organizationId,
    active: true,
  });

  if (!building) {
    return NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let name: string;
  let totalSeats: number;
  let totalRooms: number;
  let imageFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const parsed = createSchema.safeParse({
      name: formData.get("name"),
      totalSeats: Number(formData.get("totalSeats")),
      totalRooms: Number(formData.get("totalRooms")),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    name = parsed.data.name.trim();
    totalSeats = parsed.data.totalSeats;
    totalRooms = parsed.data.totalRooms;
    const file = formData.get("image");
    if (file instanceof File && file.size > 0) {
      imageFile = file;
    }
  } else {
    const json = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    name = parsed.data.name.trim();
    totalSeats = parsed.data.totalSeats;
    totalRooms = parsed.data.totalRooms;
  }

  if (!imageFile) {
    return NextResponse.json({ error: "La imagen de planta es obligatoria" }, { status: 400 });
  }

  const floor = await FloorModel.create({
    organizationId: authResult.organizationId,
    buildingId: building._id,
    name,
    totalSeats,
    totalRooms,
    imageUrl: "",
    imagePublicId: "",
    active: true,
  });

  await provisionFloorSpaces({
    organizationId: floor.organizationId,
    floorId: floor._id,
    totalSeats,
    totalRooms,
  });

  const uploaded = await uploadFloorImage({
    file: imageFile,
    organizationId: authResult.organizationId,
    buildingId: String(building._id),
    floorId: String(floor._id),
  });

  floor.imageUrl = uploaded.imageUrl;
  floor.imagePublicId = uploaded.imagePublicId;
  await floor.save();

  return NextResponse.json({ floor: serializeFloor(floor) });
}
