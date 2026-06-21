import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiOrgMemberWrite } from "@/lib/org-access";
import { serializeRoom } from "@/lib/seat-assignment";
import { connectMongo } from "@/lib/mongodb";
import { FloorModel } from "@/models/floor";
import { RoomModel } from "@/models/room";

const positionSchema = z
  .object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  })
  .nullable();

const updateSchema = z.object({
  position: positionSchema.optional(),
  capacidad: z.number().int().min(1).max(999).optional(),
  medios: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

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
  const room = await RoomModel.findOne({
    _id: id,
    organizationId: authResult.organizationId,
  });

  if (!room) {
    return NextResponse.json({ error: "Sala no encontrada" }, { status: 404 });
  }

  if (parsed.data.position !== undefined) {
    if (parsed.data.position === null) {
      room.position = { x: null, y: null };
    } else {
      room.position = { x: parsed.data.position.x, y: parsed.data.position.y };
    }
    await FloorModel.updateOne({ _id: room.floorId }, { layoutPositionSpace: "image" });
  }

  if (parsed.data.capacidad !== undefined) room.capacidad = parsed.data.capacidad;
  if (parsed.data.medios !== undefined) room.medios = parsed.data.medios;

  await room.save();

  return NextResponse.json({ room: serializeRoom(room) });
}
