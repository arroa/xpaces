import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { normalizeEmail } from "@/lib/clerk-users";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { getDevSessionUserId } from "@/lib/dev-session";
import { connectMongo } from "@/lib/mongodb";
import { UserModel, type UserDocument } from "@/models/user";

export type XpacesUser = {
  id: string;
  email: string;
  roles: string[];
  displayName: string;
  clerkUserId: string;
  organizationId: string | null;
};

function toXpacesUser(doc: UserDocument): XpacesUser {
  return {
    id: String(doc._id),
    email: doc.email,
    roles: doc.roles,
    displayName: doc.displayName,
    clerkUserId: doc.clerkUserId,
    organizationId: doc.organizationId ? String(doc.organizationId) : null,
  };
}

export async function findXpacesUserByEmail(email: string): Promise<XpacesUser | null> {
  await connectMongo();
  const doc = await UserModel.findOne({
    email: normalizeEmail(email),
    active: true,
  }).lean<UserDocument | null>();

  return doc ? toXpacesUser(doc) : null;
}

export async function findXpacesUserByClerkId(clerkUserId: string): Promise<XpacesUser | null> {
  await connectMongo();
  const doc = await UserModel.findOne({ clerkUserId, active: true }).lean<UserDocument | null>();
  return doc ? toXpacesUser(doc) : null;
}

export async function findXpacesUserById(id: string): Promise<XpacesUser | null> {
  await connectMongo();
  const doc = await UserModel.findById(id).lean<UserDocument | null>();
  if (!doc || !doc.active) {
    return null;
  }
  return toXpacesUser(doc);
}

export async function getCurrentXpacesUser(): Promise<XpacesUser | null> {
  if (isDevBypassEnabled()) {
    const devUserId = await getDevSessionUserId();
    if (!devUserId) {
      return null;
    }
    return findXpacesUserById(devUserId);
  }

  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const byClerk = await findXpacesUserByClerkId(userId);
  if (byClerk) {
    return byClerk;
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return null;
  }

  return findXpacesUserByEmail(email);
}

export async function requireCurrentXpacesUser(): Promise<XpacesUser> {
  const user = await getCurrentXpacesUser();
  if (!user) {
    redirect("/sin-acceso");
  }
  return user;
}
