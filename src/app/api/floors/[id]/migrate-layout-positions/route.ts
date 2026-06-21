import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiOrgMemberWrite } from "@/lib/org-access";
import { connectMongo } from "@/lib/mongodb";
import { FloorModel } from "@/models/floor";
import { RoomModel } from "@/models/room";
import { SeatModel } from "@/models/seat";

const positionSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
});

const bodySchema = z.object({
  seats: z.array(
    z.object({
      id: z.string(),
      position: positionSchema.nullable(),
    }),
  ),
  rooms: z.array(
    z.object({
      id: z.string(),
      position: positionSchema.nullable(),
    }),
  ),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgMemberWrite(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id: floorId } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  await connectMongo();

  const floor = await FloorModel.findOne({
    _id: floorId,
    organizationId: authResult.organizationId,
    active: true,
  });

  if (!floor) {
    return NextResponse.json({ error: "Planta no encontrada" }, { status: 404 });
  }

  for (const seat of parsed.data.seats) {
    const result = await SeatModel.updateOne(
      { _id: seat.id, floorId: floor._id, organizationId: authResult.organizationId },
      {
        ...(seat.position
          ? { position: { x: seat.position.x, y: seat.position.y } }
          : { position: { x: null, y: null } }),
      },
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: `Puesto no encontrado: ${seat.id}` }, { status: 404 });
    }
  }

  for (const room of parsed.data.rooms) {
    const result = await RoomModel.updateOne(
      { _id: room.id, floorId: floor._id, organizationId: authResult.organizationId },
      {
        ...(room.position
          ? { position: { x: room.position.x, y: room.position.y } }
          : { position: { x: null, y: null } }),
      },
    );
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: `Sala no encontrada: ${room.id}` }, { status: 404 });
    }
  }

  floor.layoutPositionSpace = "image";
  await floor.save();

  return NextResponse.json({ ok: true, layoutPositionSpace: "image" });
}
