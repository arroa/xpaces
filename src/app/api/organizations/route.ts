import { NextResponse } from "next/server";
import { z } from "zod";

import { requireApiSuperAdmin } from "@/lib/api-auth";
import { ensureClerkUser, normalizeEmail } from "@/lib/clerk-users";
import { slugify } from "@/lib/cloudinary";
import { connectMongo } from "@/lib/mongodb";
import { upsertOrgAdmin } from "@/lib/org-admin-assignment";
import { ROLE_ORG_ADMIN, ROLE_SUPER_ADMIN, ROLE_VIEWER } from "@/lib/roles";
import { BuildingModel } from "@/models/building";
import { FloorModel } from "@/models/floor";
import { OrganizationModel } from "@/models/organization";
import { UserModel, type UserDocument } from "@/models/user";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  orgAdminEmail: z.string().email(),
  orgAdminDisplayName: z.string().max(120).optional(),
});

export async function GET() {
  const authResult = await requireApiSuperAdmin();
  if ("error" in authResult) {
    return authResult.error;
  }

  await connectMongo();
  const organizations = await OrganizationModel.find({ active: true })
    .sort({ name: 1 })
    .lean();

  const orgIds = organizations.map((org) => org._id);
  const orgAdmins = await UserModel.find({
    organizationId: { $in: orgIds },
    roles: ROLE_ORG_ADMIN,
    active: true,
  }).lean();

  const adminByOrg = new Map(orgAdmins.map((admin) => [String(admin.organizationId), admin]));

  const [buildingCounts, floorCounts, viewerCounts] = await Promise.all([
    BuildingModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { organizationId: { $in: orgIds }, active: true } },
      { $group: { _id: "$organizationId", count: { $sum: 1 } } },
    ]),
    FloorModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { organizationId: { $in: orgIds }, active: true } },
      { $group: { _id: "$organizationId", count: { $sum: 1 } } },
    ]),
    UserModel.aggregate<{ _id: unknown; count: number }>([
      { $match: { organizationId: { $in: orgIds }, roles: ROLE_VIEWER, active: true } },
      { $group: { _id: "$organizationId", count: { $sum: 1 } } },
    ]),
  ]);

  const buildingsByOrg = new Map(buildingCounts.map((r) => [String(r._id), r.count]));
  const floorsByOrg = new Map(floorCounts.map((r) => [String(r._id), r.count]));
  const viewersByOrg = new Map(viewerCounts.map((r) => [String(r._id), r.count]));

  const organizationRows = organizations.map((org) => {
    const admin = adminByOrg.get(String(org._id));
    const orgId = String(org._id);
    return {
      id: orgId,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt.toISOString(),
      orgAdmin: admin
        ? { id: String(admin._id), email: admin.email, displayName: admin.displayName }
        : null,
      stats: {
        buildings: buildingsByOrg.get(orgId) ?? 0,
        floors: floorsByOrg.get(orgId) ?? 0,
        viewers: viewersByOrg.get(orgId) ?? 0,
      },
    };
  });

  const summary = organizationRows.reduce(
    (acc, org) => ({
      organizations: acc.organizations + 1,
      buildings: acc.buildings + org.stats.buildings,
      floors: acc.floors + org.stats.floors,
      viewers: acc.viewers + org.stats.viewers,
    }),
    { organizations: 0, buildings: 0, floors: 0, viewers: 0 },
  );

  return NextResponse.json({
    summary,
    organizations: organizationRows,
  });
}

export async function POST(request: Request) {
  const authResult = await requireApiSuperAdmin();
  if ("error" in authResult) {
    return authResult.error;
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { name, orgAdminEmail, orgAdminDisplayName } = parsed.data;
  const email = normalizeEmail(orgAdminEmail);
  const baseSlug = slugify(name);
  if (!baseSlug) {
    return NextResponse.json({ error: "Nombre de organización inválido" }, { status: 400 });
  }

  await connectMongo();

  const existingUser = await UserModel.findOne({ email }).lean<UserDocument | null>();
  if (
    existingUser &&
    !existingUser.roles.includes(ROLE_SUPER_ADMIN) &&
    existingUser.organizationId &&
    existingUser.roles.includes(ROLE_ORG_ADMIN)
  ) {
    return NextResponse.json(
      { error: "Ese email ya es OrgAdmin de otra organización" },
      { status: 409 },
    );
  }

  let slug = baseSlug;
  let suffix = 1;
  while (await OrganizationModel.exists({ slug })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const clerkUserId = await ensureClerkUser(email);
  const organization = await OrganizationModel.create({ name: name.trim(), slug, active: true });

  const orgAdmin = await upsertOrgAdmin({
    email,
    clerkUserId,
    organizationId: organization._id,
    displayName: orgAdminDisplayName,
  });

  return NextResponse.json({
    organization: {
      id: String(organization._id),
      name: organization.name,
      slug: organization.slug,
    },
    orgAdmin: {
      id: String(orgAdmin._id),
      email: orgAdmin.email,
      displayName: orgAdmin.displayName,
    },
  });
}
