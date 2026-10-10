import { auth } from "@/auth";
import { parseAdminGitLabIds } from "./authorization.ts";
import { authorizeAdminSession } from "./session-authorization.ts";

export async function requireAdmin() {
  try {
    const session = await auth();
    return authorizeAdminSession(session, parseAdminGitLabIds(process.env.AUTH_ADMIN_GITLAB_IDS));
  } catch {
    return authorizeAdminSession(null, parseAdminGitLabIds(process.env.AUTH_ADMIN_GITLAB_IDS));
  }
}
