export const ROLE_SUPER_ADMIN = "super_admin" as const;
export const ROLE_ORG_ADMIN = "org_admin" as const;
export const ROLE_VIEWER = "viewer" as const;

export const XSPACES_ROLES = [ROLE_SUPER_ADMIN, ROLE_ORG_ADMIN, ROLE_VIEWER] as const;

export type XpacesRole = (typeof XSPACES_ROLES)[number];

export function isSuperAdmin(roles: string[]): boolean {
  return roles.includes(ROLE_SUPER_ADMIN);
}

export function isOrgAdmin(roles: string[]): boolean {
  return roles.includes(ROLE_ORG_ADMIN);
}

export function isViewer(roles: string[]): boolean {
  return roles.includes(ROLE_VIEWER);
}

export function roleLabel(roles: string[]): string {
  const parts: string[] = [];
  if (isSuperAdmin(roles)) parts.push("Super admin");
  if (isOrgAdmin(roles)) parts.push("Org admin");
  if (isViewer(roles)) parts.push("Viewer");
  return parts.length > 0 ? parts.join(" · ") : "Usuario";
}
