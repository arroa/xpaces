import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiSuperAdmin } from "@/lib/api-auth";
import { ensureClerkUser, normalizeEmail } from "@/lib/clerk-users";
import { slugify } from "@/lib/cloudinary";
import { connectMongo } from "@/lib/mongodb";
import {
  demoteOtherOrgAdmins,
  isOrgAdminOfAnotherOrganization,
  upsertOrgAdmin,
} from "@/lib/org-admin-assignment";
import { OrganizationModel, type OrganizationDocument } from "@/models/organization";
import { UserModel, type UserDocument } from "@/models/user";

const updateSchema = z.object({
  name: z.string().min(2).max(120),
  orgAdminEmail: z.string().email(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireApiSuperAdmin();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { id } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { name, orgAdminEmail } = parsed.data;
  const email = normalizeEmail(orgAdminEmail);
  const trimmedName = name.trim();

  await connectMongo();

  const organization = await OrganizationModel.findOne({ _id: id, active: true }).lean<
    OrganizationDocument | null
  >();
  if (!organization) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const existingUser = await UserModel.findOne({ email }).lean<UserDocument | null>();
  if (isOrgAdminOfAnotherOrganization(existingUser, id)) {
    return NextResponse.json(
      { error: "Ese email ya es OrgAdmin de otra organización" },
      { status: 409 },
    );
  }

  const baseSlug = slugify(trimmedName);
  if (!baseSlug) {
    return NextResponse.json({ error: "Nombre de organización inválido" }, { status: 400 });
  }

  let slug = baseSlug;
  if (slug !== organization.slug) {
    let suffix = 1;
    while (await OrganizationModel.exists({ slug, _id: { $ne: id } })) {
      slug = `${baseSlug}-${suffix++}`;
    }
  }

  const clerkUserId = await ensureClerkUser(email);

  await OrganizationModel.updateOne({ _id: id }, { name: trimmedName, slug });
  await demoteOtherOrgAdmins(id, email);

  const orgAdmin = await upsertOrgAdmin({
    email,
    clerkUserId,
    organizationId: id,
  });

  return NextResponse.json({
    organization: {
      id: String(id),
      name: trimmedName,
      slug,
    },
    orgAdmin: {
      id: String(orgAdmin._id),
      email: orgAdmin.email,
      displayName: orgAdmin.displayName,
    },
  });
}
