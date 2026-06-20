import { Types } from "mongoose";

import { AssignmentHistoryModel } from "@/models/assignment-history";
import { CatalogModel } from "@/models/catalog";
import type { SeatDocument } from "@/models/seat";

export type CatalogType = "grupo" | "equipo" | "empresa";

export function deriveEstado(persona: string): "disponible" | "ocupado" {
  return persona.trim() ? "ocupado" : "disponible";
}

export async function upsertCatalogValues(
  organizationId: string,
  values: Partial<Record<CatalogType, string>>,
) {
  const entries = (Object.entries(values) as [CatalogType, string][])
    .map(([type, value]) => ({ type, value: value.trim() }))
    .filter((entry) => entry.value.length > 0);

  await Promise.all(
    entries.map((entry) =>
      CatalogModel.updateOne(
        { organizationId, type: entry.type, value: entry.value },
        { organizationId, type: entry.type, value: entry.value },
        { upsert: true },
      ),
    ),
  );
}

export async function loadCatalogs(organizationId: string) {
  const rows = await CatalogModel.find({ organizationId })
    .sort({ type: 1, value: 1 })
    .lean();

  return {
    grupo: rows.filter((r) => r.type === "grupo").map((r) => r.value),
    equipo: rows.filter((r) => r.type === "equipo").map((r) => r.value),
    empresa: rows.filter((r) => r.type === "empresa").map((r) => r.value),
  };
}

export function serializeSeat(seat: SeatDocument) {
  return {
    id: String(seat._id),
    code: seat.code,
    position:
      seat.position.x != null && seat.position.y != null
        ? { x: seat.position.x, y: seat.position.y }
        : null,
    grupo: seat.grupo,
    equipo: seat.equipo,
    empresa: seat.empresa,
    persona: seat.persona,
    estado: seat.estado,
  };
}

export function serializeRoom(room: {
  _id: Types.ObjectId;
  code: string;
  position: { x: number | null; y: number | null };
  capacidad: number;
  medios: boolean;
}) {
  return {
    id: String(room._id),
    code: room.code,
    position:
      room.position.x != null && room.position.y != null
        ? { x: room.position.x, y: room.position.y }
        : null,
    capacidad: room.capacidad,
    medios: room.medios,
  };
}

function detectAssignmentAction(
  before: Pick<SeatDocument, "persona" | "grupo" | "equipo" | "empresa" | "position">,
  after: Pick<SeatDocument, "persona" | "grupo" | "equipo" | "empresa" | "position">,
): "assign" | "release" | "move" | "update" {
  const beforePersona = before.persona.trim();
  const afterPersona = after.persona.trim();
  const positionChanged =
    before.position.x !== after.position.x || before.position.y !== after.position.y;

  if (positionChanged && !beforePersona && !afterPersona) {
    return "move";
  }
  if (positionChanged) {
    return "move";
  }
  if (!beforePersona && afterPersona) {
    return "assign";
  }
  if (beforePersona && !afterPersona) {
    return "release";
  }
  return "update";
}

export async function recordSeatHistory(params: {
  seat: SeatDocument;
  before: Pick<SeatDocument, "persona" | "grupo" | "equipo" | "empresa" | "position" | "estado">;
  changedByUserId: string;
}) {
  const { seat, before, changedByUserId } = params;
  const after = {
    persona: seat.persona,
    grupo: seat.grupo,
    equipo: seat.equipo,
    empresa: seat.empresa,
    position: seat.position,
    estado: seat.estado,
  };

  const assignmentChanged =
    before.persona !== after.persona ||
    before.grupo !== after.grupo ||
    before.equipo !== after.equipo ||
    before.empresa !== after.empresa ||
    before.estado !== after.estado;

  const positionChanged =
    before.position.x !== after.position.x || before.position.y !== after.position.y;

  if (!assignmentChanged && !positionChanged) {
    return;
  }

  await AssignmentHistoryModel.create({
    organizationId: seat.organizationId,
    floorId: seat.floorId,
    seatId: seat._id,
    seatCode: seat.code,
    persona: seat.persona,
    grupo: seat.grupo,
    equipo: seat.equipo,
    empresa: seat.empresa,
    estado: seat.estado,
    action: detectAssignmentAction(before, after),
    changedByUserId: new Types.ObjectId(changedByUserId),
  });
}
