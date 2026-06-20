import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isDevBypassEnabled } from "@/lib/dev-flags";
import { getDevSessionUserId } from "@/lib/dev-session";
import { isOrgAdmin, isSuperAdmin } from "@/lib/roles";
import { findXpacesUserById, getCurrentXpacesUser } from "@/lib/xpaces-user";

export async function requireApiXpacesUser() {
  if (isDevBypassEnabled()) {
    const devUserId = await getDevSessionUserId();
    if (!devUserId) {
      return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
    }
    const user = await findXpacesUserById(devUserId);
    if (user) {
      return { user };
    }
    return { error: NextResponse.json({ error: "Sin acceso a Xpaces" }, { status: 403 }) };
  }

  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const user = await getCurrentXpacesUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Sin acceso a Xpaces" }, { status: 403 }) };
  }

  return { user };
}

export async function requireApiSuperAdmin() {
  const authResult = await requireApiXpacesUser();
  if ("error" in authResult) {
    return authResult;
  }

  if (!isSuperAdmin(authResult.user.roles)) {
    return {
      error: NextResponse.json({ error: "Solo super admin" }, { status: 403 }),
    };
  }

  return authResult;
}

export async function requireApiOrgAdmin() {
  const authResult = await requireApiXpacesUser();
  if ("error" in authResult) {
    return authResult;
  }

  if (isSuperAdmin(authResult.user.roles)) {
    return authResult;
  }

  if (!isOrgAdmin(authResult.user.roles) || !authResult.user.organizationId) {
    return {
      error: NextResponse.json({ error: "Solo org admin" }, { status: 403 }),
    };
  }

  return authResult;
}

export function canAccessOrganization(
  user: { roles: string[]; organizationId: string | null },
  organizationId: string,
) {
  if (isSuperAdmin(user.roles)) {
    return true;
  }
  return user.organizationId === organizationId;
}
