import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiOrgMemberWrite } from "@/lib/org-access";
import {
  deriveEstado,
  recordSeatHistory,
  serializeSeat,
  upsertCatalogValues,
} from "@/lib/seat-assignment";
import { connectMongo } from "@/lib/mongodb";
import { SeatModel } from "@/models/seat";

const positionSchema = z
  .object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  })
  .nullable();

const updateSchema = z.object({
  position: positionSchema.optional(),
  grupo: z.string().max(120).optional(),
  equipo: z.string().max(120).optional(),
  empresa: z.string().max(120).optional(),
  persona: z.string().max(120).optional(),
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
  const seat = await SeatModel.findOne({
    _id: id,
    organizationId: authResult.organizationId,
  });

  if (!seat) {
    return NextResponse.json({ error: "Puesto no encontrado" }, { status: 404 });
  }

  const before = {
    persona: seat.persona,
    grupo: seat.grupo,
    equipo: seat.equipo,
    empresa: seat.empresa,
    position: { x: seat.position.x, y: seat.position.y },
    estado: seat.estado,
  };

  if (parsed.data.position !== undefined) {
    if (parsed.data.position === null) {
      seat.position = { x: null, y: null };
    } else {
      seat.position = { x: parsed.data.position.x, y: parsed.data.position.y };
    }
  }

  if (parsed.data.grupo !== undefined) seat.grupo = parsed.data.grupo.trim();
  if (parsed.data.equipo !== undefined) seat.equipo = parsed.data.equipo.trim();
  if (parsed.data.empresa !== undefined) seat.empresa = parsed.data.empresa.trim();
  if (parsed.data.persona !== undefined) seat.persona = parsed.data.persona.trim();

  seat.estado = deriveEstado(seat.persona);
  await seat.save();

  await upsertCatalogValues(authResult.organizationId, {
    grupo: seat.grupo,
    equipo: seat.equipo,
    empresa: seat.empresa,
  });

  await recordSeatHistory({
    seat,
    before,
    changedByUserId: authResult.user.id,
  });

  return NextResponse.json({ seat: serializeSeat(seat) });
}
