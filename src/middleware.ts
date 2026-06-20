import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isDevBypassEnabled } from "@/lib/dev-flags";
import { getDevSessionUserIdFromRequest } from "@/lib/dev-session-edge";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sin-acceso",
  "/api/health(.*)",
  "/api/auth/check-access(.*)",
  "/api/auth/dev-login(.*)",
  "/api/auth/dev-logout(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isDevBypassEnabled()) {
    if (await getDevSessionUserIdFromRequest(request)) {
      return;
    }
    if (!isPublicRoute(request)) {
      const signInUrl = new URL("/sign-in", request.url);
      return NextResponse.redirect(signInUrl);
    }
    return;
  }

  if (await getDevSessionUserIdFromRequest(request)) {
    return;
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
