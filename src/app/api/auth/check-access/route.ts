import { NextResponse } from "next/server";
import { z } from "zod";

import { normalizeEmail } from "@/lib/clerk-users";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { findXpacesUserByEmail } from "@/lib/xpaces-user";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ allowed: false }, { status: 400 });
  }

  const user = await findXpacesUserByEmail(normalizeEmail(parsed.data.email));

  return NextResponse.json({
    allowed: Boolean(user),
    devBypass: isDevBypassEnabled(),
  });
}
