import NextAuth, { NextAuthOptions } from "next-auth"
import { JWT } from "next-auth/jwt"

export const authOptions: NextAuthOptions = {
    providers: [
        {
            id: "zitadel",
            name: "Zitadel",
            type: "oauth",
            wellKnown: `${process.env.ZITADEL_ISSUER}/.well-known/openid-configuration`,
            authorization: {
                params: {
                    scope: "openid email profile offline_access"
                }
            },
            clientId: process.env.ZITADEL_CLIENT_ID,
            clientSecret: process.env.ZITADEL_CLIENT_SECRET,
            client: {
                token_endpoint_auth_method: "client_secret_post"
            },
            checks: ["pkce", "state"],
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name ?? profile.preferred_username,
                    email: profile.email,
                    image: profile.picture,
                }
            },
        }
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            // Persist the OAuth access_token and refresh_token to the token right after signin
            if (account) {
                token.accessToken = account.access_token
                token.refreshToken = account.refresh_token
                token.idToken = account.id_token
                token.expiresAt = account.expires_at
            }
            return token
        },
        async session({ session, token }) {
            // Send properties to the client
            if (token) {
                session.accessToken = token.accessToken as string
                session.idToken = token.idToken as string
                session.error = token.error as string
            }
            return session
        }
    },
    pages: {
        signIn: '/auth/signin',
        error: '/auth/error'
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }