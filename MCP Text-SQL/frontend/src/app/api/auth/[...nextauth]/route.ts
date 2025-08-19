import NextAuth, { AuthOptions } from "next-auth";
import ZitadelProvider from "next-auth/providers/zitadel";

export const authOptions: AuthOptions = {
    providers: [
        ZitadelProvider({
            issuer: process.env.ZITADEL_ISSUER,
            clientId: process.env.ZITADEL_CLIENT_ID!,
            clientSecret: process.env.ZITADEL_CLIENT_SECRET!,
            authorization: { params: { scope: "openid email profile" } },
        }),
    ],
    callbacks: {
        jwt({ token, account }) {
            if (account) {
                token.idToken = account.id_token;
            }
            return token;
        },

        session({ session, token }) {
            session.idToken = token.idToken;
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
