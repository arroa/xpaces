import { NextResponse } from "next/server";

import { requireApiOrgAdminContext } from "@/lib/org-access";
import {
  loadSeatSearchOptions,
  searchSeats,
  type SeatSearchFilters,
} from "@/lib/seat-consultation";
import { connectMongo } from "@/lib/mongodb";

function readFilter(value: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export async function GET(request: Request) {
  const authResult = await requireApiOrgAdminContext(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { searchParams } = new URL(request.url);
  const buildingId = readFilter(searchParams.get("buildingId"));

  await connectMongo();
  const options = await loadSeatSearchOptions(authResult.organizationId);

  if (!buildingId) {
    return NextResponse.json({ options, seats: [], total: 0 });
  }

  const filters: SeatSearchFilters = {
    buildingId,
    persona: readFilter(searchParams.get("persona")),
    grupo: readFilter(searchParams.get("grupo")),
    equipo: readFilter(searchParams.get("equipo")),
    empresa: readFilter(searchParams.get("empresa")),
    floorId: readFilter(searchParams.get("floorId")),
  };

  const seats = await searchSeats(authResult.organizationId, filters);

  return NextResponse.json({
    options,
    seats,
    total: seats.length,
  });
}
