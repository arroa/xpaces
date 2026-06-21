import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiOrgAdminContext } from "@/lib/org-access";
import { ensureClerkUser, normalizeEmail } from "@/lib/clerk-users";
import { connectMongo } from "@/lib/mongodb";
import { ROLE_VIEWER } from "@/lib/roles";
import {
  getViewerFloorIdsByUserIds,
  syncViewerFloorAccess,
  validateFloorIdsForOrganization,
} from "@/lib/viewer-floor-access";
import { UserModel, type UserDocument } from "@/models/user";

const createSchema = z.object({
  email: z.string().email(),
  displayName: z.string().max(120).optional(),
  floorIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  const authResult = await requireApiOrgAdminContext(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  await connectMongo();
  const viewers = await UserModel.find({
    organizationId: authResult.organizationId,
    roles: ROLE_VIEWER,
    active: true,
  })
    .sort({ email: 1 })
    .lean();

  const floorIdsByUser = await getViewerFloorIdsByUserIds(
    authResult.organizationId,
    viewers.map((viewer) => String(viewer._id)),
  );

  return NextResponse.json({
    viewers: viewers.map((viewer) => ({
      id: String(viewer._id),
      email: viewer.email,
      displayName: viewer.displayName,
      floorIds: floorIdsByUser.get(String(viewer._id)) ?? [],
    })),
  });
}

export async function POST(request: Request) {
  const authResult = await requireApiOrgAdminContext(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const floorIds = parsed.data.floorIds ?? [];

  const floorValidation = await validateFloorIdsForOrganization(
    authResult.organizationId,
    floorIds,
  );
  if (!floorValidation.ok) {
    return NextResponse.json({ error: floorValidation.error }, { status: 400 });
  }

  const clerkUserId = await ensureClerkUser(email);

  await connectMongo();

  const existing = await UserModel.findOne({ email }).lean<UserDocument | null>();
  if (existing) {
    const existingOrgId = existing.organizationId ? String(existing.organizationId) : null;
    const belongsToOtherOrg =
      existing.active && existingOrgId !== null && existingOrgId !== authResult.organizationId;
    if (belongsToOtherOrg) {
      return NextResponse.json(
        { error: "El usuario pertenece a otra organización" },
        { status: 409 },
      );
    }
  }

  const viewer = await UserModel.findOneAndUpdate(
    { email },
    {
      email,
      clerkUserId,
      roles: [ROLE_VIEWER],
      active: true,
      organizationId: authResult.organizationId,
      displayName: parsed.data.displayName?.trim() ?? "",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await syncViewerFloorAccess(String(viewer._id), authResult.organizationId, floorValidation.floorIds);

  return NextResponse.json({
    viewer: {
      id: String(viewer._id),
      email: viewer.email,
      displayName: viewer.displayName,
      floorIds: floorValidation.floorIds,
    },
  });
}
