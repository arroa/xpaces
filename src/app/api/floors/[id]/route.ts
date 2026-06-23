import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteCloudinaryImage, uploadFloorImage } from "@/lib/cloudinary-upload";
import { FLOOR_MAX_ROOMS, FLOOR_MAX_SEATS } from "@/lib/floor-limits";
import { cascadeDeleteFloorData } from "@/lib/floor-deletion";
import { requireApiOrgMember, requireApiOrgMemberWrite } from "@/lib/org-access";
import { replaceFloorSpaces, serializeFloor } from "@/lib/floor-spaces";
import { connectMongo } from "@/lib/mongodb";
import { FloorModel, type FloorDocument } from "@/models/floor";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  totalSeats: z.number().int().min(1).max(FLOOR_MAX_SEATS).optional(),
  totalRooms: z.number().int().min(0).max(FLOOR_MAX_ROOMS).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

async function getFloorForOrg(floorId: string, organizationId: string) {
  await connectMongo();
  return FloorModel.findOne({ _id: floorId, organizationId, active: true }).lean<FloorDocument | null>();
}

export async function GET(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMember(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const floor = await getFloorForOrg(id, authResult.organizationId);
  if (!floor) {
    return NextResponse.json({ error: "Planta no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ floor: serializeFloor(floor) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMemberWrite(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  await connectMongo();

  const floor = await FloorModel.findOne({
    _id: id,
    organizationId: authResult.organizationId,
    active: true,
  });

  if (!floor) {
    return NextResponse.json({ error: "Planta no encontrada" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const name = formData.get("name");
    const totalSeatsRaw = formData.get("totalSeats");
    const totalRoomsRaw = formData.get("totalRooms");
    const file = formData.get("image");

    if (typeof name === "string" && name.trim()) {
      floor.name = name.trim();
    }
    if (totalSeatsRaw != null && totalSeatsRaw !== "") {
      const totalSeats = Number(totalSeatsRaw);
      if (Number.isInteger(totalSeats) && totalSeats >= 1 && totalSeats <= FLOOR_MAX_SEATS) {
        if (totalSeats !== floor.totalSeats) {
          floor.totalSeats = totalSeats;
          await replaceFloorSpaces({
            organizationId: floor.organizationId,
            floorId: floor._id,
            totalSeats,
            totalRooms: floor.totalRooms,
          });
        }
      }
    }
    if (totalRoomsRaw != null && totalRoomsRaw !== "") {
      const totalRooms = Number(totalRoomsRaw);
      if (Number.isInteger(totalRooms) && totalRooms >= 0 && totalRooms <= FLOOR_MAX_ROOMS) {
        if (totalRooms !== floor.totalRooms) {
          floor.totalRooms = totalRooms;
          await replaceFloorSpaces({
            organizationId: floor.organizationId,
            floorId: floor._id,
            totalSeats: floor.totalSeats,
            totalRooms,
          });
        }
      }
    }

    if (file instanceof File && file.size > 0) {
      if (floor.imagePublicId) {
        await deleteCloudinaryImage(floor.imagePublicId).catch(() => undefined);
      }
      const uploaded = await uploadFloorImage({
        file,
        organizationId: authResult.organizationId,
        buildingId: String(floor.buildingId),
        floorId: String(floor._id),
      });
      floor.imageUrl = uploaded.imageUrl;
      floor.imagePublicId = uploaded.imagePublicId;
    }
  } else {
    const json = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (parsed.data.name) {
      floor.name = parsed.data.name.trim();
    }

    const nextSeats = parsed.data.totalSeats ?? floor.totalSeats;
    const nextRooms = parsed.data.totalRooms ?? floor.totalRooms;

    if (nextSeats !== floor.totalSeats || nextRooms !== floor.totalRooms) {
      floor.totalSeats = nextSeats;
      floor.totalRooms = nextRooms;
      await replaceFloorSpaces({
        organizationId: floor.organizationId,
        floorId: floor._id,
        totalSeats: nextSeats,
        totalRooms: nextRooms,
      });
    }
  }

  await floor.save();
  return NextResponse.json({ floor: serializeFloor(floor) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMemberWrite(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  await connectMongo();

  const floor = await FloorModel.findOne({
    _id: id,
    organizationId: authResult.organizationId,
    active: true,
  });

  if (!floor) {
    return NextResponse.json({ error: "Planta no encontrada" }, { status: 404 });
  }

  await cascadeDeleteFloorData(floor);
  floor.active = false;
  await floor.save();

  return NextResponse.json({ ok: true });
}
