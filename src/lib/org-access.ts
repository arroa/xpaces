import { NextResponse } from "next/server";

import { requireApiXpacesUser } from "@/lib/api-auth";
import { ORG_CONTEXT_HEADER } from "@/lib/org-api-client";
import { connectMongo } from "@/lib/mongodb";
import { isOrgAdmin, isSuperAdmin, isViewer } from "@/lib/roles";
import type { XpacesUser } from "@/lib/xpaces-user";
import { OrganizationModel } from "@/models/organization";

export type OrgMemberAuth = {
  user: XpacesUser;
  organizationId: string;
};

export function getOrganizationIdFromRequest(request: Request): string | null {
  const value = request.headers.get(ORG_CONTEXT_HEADER)?.trim();
  return value || null;
}

async function resolveOrganizationId(
  user: XpacesUser,
  request: Request,
): Promise<{ organizationId: string } | { error: NextResponse }> {
  if (isSuperAdmin(user.roles)) {
    const organizationId = getOrganizationIdFromRequest(request);
    if (organizationId) {
      await connectMongo();
      const organization = await OrganizationModel.findOne({
        _id: organizationId,
        active: true,
      }).lean();

      if (!organization) {
        return {
          error: NextResponse.json({ error: "Organización no encontrada" }, { status: 404 }),
        };
      }

      return { organizationId };
    }

    if (isOrgAdmin(user.roles) && user.organizationId) {
      return { organizationId: user.organizationId };
    }

    return {
      error: NextResponse.json({ error: "Organización requerida" }, { status: 400 }),
    };
  }

  if (!user.organizationId || (!isOrgAdmin(user.roles) && !isViewer(user.roles))) {
    return {
      error: NextResponse.json({ error: "Sin acceso a esta organización" }, { status: 403 }),
    };
  }

  return { organizationId: user.organizationId };
}

export async function requireApiOrgMember(
  request: Request,
): Promise<{ error: NextResponse } | OrgMemberAuth> {
  const authResult = await requireApiXpacesUser();
  if ("error" in authResult) {
    return authResult as { error: NextResponse };
  }

  const orgResult = await resolveOrganizationId(authResult.user, request);
  if ("error" in orgResult) {
    return orgResult;
  }

  return { user: authResult.user, organizationId: orgResult.organizationId };
}

export async function requireApiOrgMemberWrite(
  request: Request,
): Promise<{ error: NextResponse } | OrgMemberAuth> {
  const authResult = await requireApiOrgMember(request);
  if ("error" in authResult) {
    return authResult;
  }

  if (!isOrgAdmin(authResult.user.roles) && !isSuperAdmin(authResult.user.roles)) {
    return {
      error: NextResponse.json({ error: "Solo org admin puede modificar" }, { status: 403 }),
    };
  }

  return authResult;
}

export async function requireApiOrgAdminContext(
  request: Request,
): Promise<{ error: NextResponse } | OrgMemberAuth> {
  const authResult = await requireApiXpacesUser();
  if ("error" in authResult) {
    return authResult as { error: NextResponse };
  }

  if (isSuperAdmin(authResult.user.roles)) {
    const orgResult = await resolveOrganizationId(authResult.user, request);
    if ("error" in orgResult) {
      return orgResult;
    }
    return { user: authResult.user, organizationId: orgResult.organizationId };
  }

  if (!isOrgAdmin(authResult.user.roles) || !authResult.user.organizationId) {
    return {
      error: NextResponse.json({ error: "Solo org admin" }, { status: 403 }),
    };
  }

  return { user: authResult.user, organizationId: authResult.user.organizationId };
}

export function canWriteOrg(user: XpacesUser): boolean {
  return isOrgAdmin(user.roles) || isSuperAdmin(user.roles);
}
