import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseAdminGitLabIds } from "@/lib/admin-auth/authorization";
import { authorizeAdminSession } from "@/lib/admin-auth/session-authorization";

export default auth((request) => {
  const access = authorizeAdminSession(
    request.auth,
    parseAdminGitLabIds(process.env.AUTH_ADMIN_GITLAB_IDS)
  );
  if (access.authorized) return NextResponse.next();
  const signIn = new URL("/api/auth/signin", request.nextUrl.origin);
  signIn.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(signIn);
});

export const config = { matcher: ["/admin/:path*"] };
