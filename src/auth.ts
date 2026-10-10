import NextAuth from "next-auth";
import GitLab from "next-auth/providers/gitlab";
import { authorizeAdminIdentity, parseAdminGitLabIds } from "@/lib/admin-auth/authorization";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitLab],
  session: { strategy: "jwt" },
  callbacks: {
    signIn({ account }) {
      return authorizeAdminIdentity(
        account ? { provider: account.provider, providerAccountId: account.providerAccountId } : null,
        parseAdminGitLabIds(process.env.AUTH_ADMIN_GITLAB_IDS)
      ).authorized;
    },
    jwt({ token, account }) {
      if (account) {
        token.gitlabId = account.provider === "gitlab" ? account.providerAccountId : undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.gitlabId === "string") {
        session.user.id = token.gitlabId;
      }
      return session;
    },
  },
});
