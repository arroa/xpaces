import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeEmail } from "@/lib/clerk-users";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { createDevSessionToken, devSessionCookieOptions } from "@/lib/dev-session";
import { findXpacesUserByEmail } from "@/lib/xpaces-user";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  if (!isDevBypassEnabled()) {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const user = await findXpacesUserByEmail(normalizeEmail(parsed.data.email));
  if (!user) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
  }

  const token = await createDevSessionToken(user.id);
  const response = NextResponse.json({ ok: true });
  const cookie = devSessionCookieOptions(token);
  response.cookies.set(cookie.name, cookie.value, cookie);

  return response;
}
