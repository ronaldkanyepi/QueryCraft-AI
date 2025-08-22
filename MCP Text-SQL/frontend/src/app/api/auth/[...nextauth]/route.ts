import NextAuth, { AuthOptions } from "next-auth";
import ZitadelProvider from "next-auth/providers/zitadel";


export const authOptions: AuthOptions = {
    providers: [
        ZitadelProvider({
            issuer: process.env.ZITADEL_ISSUER,
            clientId: process.env.ZITADEL_CLIENT_ID!,
            clientSecret: process.env.ZITADEL_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "openid email profile urn:zitadel:iam:org:project:id:zitadel:aud urn:zitadel:iam:org:projects:roles",
                    audience: process.env.ZITADEL_BACKEND_CLIENT_ID
                }
            },
        }),
    ],
    callbacks: {
        jwt({ token, user, account, profile}) {

            if (account) {
                token.idToken = account.id_token;
                token.accessToken = account.access_token;
            }


            if (user) {
                token.sub = user.id;
            }
            if (profile) {
                token.given_name = profile.given_name;
                token.family_name = profile.family_name;
                token.preferred_username = profile.preferred_username;
                token.roles = profile["urn:zitadel:iam:org:project:roles"];
                token.locale = profile.locale;
                token.email_verified = profile.email_verified;
                token.gender = profile.gender;
                token.auth_time = profile.auth_time;
                token.updated_at = profile.updated_at;
            }
            return token;
        },

        session({ session, token }) {
            if (session.user) {
                session.user.id = token.sub;
                session.user.given_name = token.given_name;
                session.user.family_name = token.family_name;
                session.user.preferred_username = token.preferred_username;
                session.user.roles = token.roles;
                session.user.locale = token.locale;
                session.user.email_verified = token.email_verified;
                session.user.gender = token.gender;
                session.user.auth_time = token.auth_time;
                session.user.updated_at = token.updated_at;
            }
            session.idToken = token.idToken;
            session.accessToken = token.accessToken;
            return session;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
