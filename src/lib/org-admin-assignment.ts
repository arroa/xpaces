import type { Types } from "mongoose";

import { ROLE_ORG_ADMIN, ROLE_SUPER_ADMIN, type XpacesRole } from "@/lib/roles";
import { UserModel } from "@/models/user";

export function mergeOrgAdminRoles(existingRoles: string[]): XpacesRole[] {
  const roles = new Set(existingRoles);
  roles.add(ROLE_ORG_ADMIN);
  return Array.from(roles) as XpacesRole[];
}

export async function demoteOtherOrgAdmins(organizationId: string, keepEmail: string) {
  const previousAdmins = await UserModel.find({
    organizationId,
    roles: ROLE_ORG_ADMIN,
    active: true,
    email: { $ne: keepEmail },
  });

  for (const admin of previousAdmins) {
    admin.roles = admin.roles.filter((role: string) => role !== ROLE_ORG_ADMIN) as XpacesRole[];
    if (!admin.roles.includes(ROLE_ORG_ADMIN)) {
      admin.organizationId = null;
    }
    if (admin.roles.length === 0) {
      admin.active = false;
    }
    await admin.save();
  }
}

export async function upsertOrgAdmin(params: {
  email: string;
  clerkUserId: string;
  organizationId: Types.ObjectId | string;
  displayName?: string;
}) {
  const existing = await UserModel.findOne({ email: params.email });
  const roles = mergeOrgAdminRoles(existing?.roles ?? []);

  const update: Record<string, unknown> = {
    email: params.email,
    clerkUserId: params.clerkUserId,
    roles,
    active: true,
    organizationId: params.organizationId,
  };

  if (params.displayName !== undefined) {
    update.displayName = params.displayName.trim();
  }

  return UserModel.findOneAndUpdate({ email: params.email }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });
}

export function isOrgAdminOfAnotherOrganization(
  user: { organizationId: unknown; roles: string[] } | null,
  organizationId: string,
): boolean {
  if (!user?.organizationId || !user.roles.includes(ROLE_ORG_ADMIN)) {
    return false;
  }
  if (user.roles.includes(ROLE_SUPER_ADMIN)) {
    return false;
  }
  return String(user.organizationId) !== organizationId;
}
