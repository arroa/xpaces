import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiOrgAdminContext } from "@/lib/org-access";
import { ensureClerkUser, normalizeEmail } from "@/lib/clerk-users";
import { connectMongo } from "@/lib/mongodb";
import { ROLE_VIEWER } from "@/lib/roles";
import { UserModel, type UserDocument } from "@/models/user";

const createSchema = z.object({
  email: z.string().email(),
  displayName: z.string().max(120).optional(),
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

  return NextResponse.json({
    viewers: viewers.map((viewer) => ({
      id: String(viewer._id),
      email: viewer.email,
      displayName: viewer.displayName,
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
  const clerkUserId = await ensureClerkUser(email);

  await connectMongo();

  const existing = await UserModel.findOne({ email }).lean<UserDocument | null>();
  if (existing && String(existing.organizationId) !== authResult.organizationId) {
    return NextResponse.json({ error: "El usuario pertenece a otra organización" }, { status: 409 });
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

  return NextResponse.json({
    viewer: {
      id: String(viewer._id),
      email: viewer.email,
      displayName: viewer.displayName,
    },
  });
}
