import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiOrgAdminContext } from "@/lib/org-access";
import { connectMongo } from "@/lib/mongodb";
import { ROLE_VIEWER } from "@/lib/roles";
import {
  getViewerFloorIds,
  syncViewerFloorAccess,
  validateFloorIdsForOrganization,
} from "@/lib/viewer-floor-access";
import { ViewerFloorAccessModel } from "@/models/viewer-floor-access";
import { UserModel } from "@/models/user";

const updateSchema = z.object({
  displayName: z.string().max(120).optional(),
  floorIds: z.array(z.string()).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgAdminContext(request);
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

  const viewer = await UserModel.findOne({
    _id: id,
    organizationId: authResult.organizationId,
    roles: ROLE_VIEWER,
    active: true,
  });

  if (!viewer) {
    return NextResponse.json({ error: "Viewer no encontrado" }, { status: 404 });
  }

  if (parsed.data.displayName !== undefined) {
    viewer.displayName = parsed.data.displayName.trim();
    await viewer.save();
  }

  let floorIds = await getViewerFloorIds(String(viewer._id), authResult.organizationId);
  if (parsed.data.floorIds !== undefined) {
    const floorValidation = await validateFloorIdsForOrganization(
      authResult.organizationId,
      parsed.data.floorIds,
    );
    if (!floorValidation.ok) {
      return NextResponse.json({ error: floorValidation.error }, { status: 400 });
    }
    await syncViewerFloorAccess(
      String(viewer._id),
      authResult.organizationId,
      floorValidation.floorIds,
    );
    floorIds = floorValidation.floorIds;
  }

  return NextResponse.json({
    viewer: {
      id: String(viewer._id),
      email: viewer.email,
      displayName: viewer.displayName,
      floorIds,
    },
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const authResult = await requireApiOrgAdminContext(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;

  await connectMongo();

  const viewer = await UserModel.findOne({
    _id: id,
    organizationId: authResult.organizationId,
    roles: ROLE_VIEWER,
    active: true,
  });

  if (!viewer) {
    return NextResponse.json({ error: "Viewer no encontrado" }, { status: 404 });
  }

  await ViewerFloorAccessModel.deleteMany({
    userId: viewer._id,
    organizationId: authResult.organizationId,
  });

  viewer.active = false;
  viewer.organizationId = null;
  await viewer.save();

  return NextResponse.json({ ok: true });
}
