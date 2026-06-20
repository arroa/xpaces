import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/sign-in-form";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { getCurrentXpacesUser } from "@/lib/xpaces-user";

export default async function SignInPage() {
  const xpacesUser = await getCurrentXpacesUser();
  if (xpacesUser) {
    redirect("/dashboard");
  }

  if (!isDevBypassEnabled()) {
    const { userId } = await auth();
    if (userId) {
      redirect("/sin-acceso");
    }
  }

  return <SignInForm devBypass={isDevBypassEnabled()} />;
}
