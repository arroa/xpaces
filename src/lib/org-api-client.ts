export const ORG_CONTEXT_HEADER = "x-organization-id";

export function withOrgContext(organizationId?: string, init: RequestInit = {}): RequestInit {
  if (!organizationId) {
    return init;
  }

  const headers = new Headers(init.headers);
  headers.set(ORG_CONTEXT_HEADER, organizationId);
  return { ...init, headers };
}
