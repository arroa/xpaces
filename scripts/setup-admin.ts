import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import { ensureClerkUser, formatClerkError, normalizeEmail } from "../src/lib/clerk-users";
import { ROLE_SUPER_ADMIN } from "../src/lib/roles";
import { connectMongo } from "../src/lib/mongodb";
import { UserModel } from "../src/models/user";

async function setupAdmin() {
  const rawEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!rawEmail?.trim()) {
    throw new Error("Define SUPER_ADMIN_EMAIL en .env.local");
  }

  const email = normalizeEmail(rawEmail);

  console.log("→ Sincronizando identidad en Clerk…");
  const clerkUserId = await ensureClerkUser(email, { forceClerk: true });
  console.log("  Identidad OK:", clerkUserId);

  await connectMongo();

  const user = await UserModel.findOneAndUpdate(
    { email },
    {
      email,
      clerkUserId,
      roles: [ROLE_SUPER_ADMIN],
      active: true,
      organizationId: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log("→ Super admin en Mongo OK");
  console.log("  userId:", user._id.toString());
  console.log("  email:", user.email);
  console.log("  roles:", user.roles.join(", "));
  console.log("");
  console.log("Listo. Inicia sesión en /sign-in con ese email (OTP de Clerk).");

  process.exit(0);
}

setupAdmin().catch((error) => {
  console.error("setup:admin falló:", formatClerkError(error));
  process.exit(1);
});
