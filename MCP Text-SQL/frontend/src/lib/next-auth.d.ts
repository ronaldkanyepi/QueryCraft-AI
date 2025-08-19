import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
    interface Session {
        accessToken?: string
        idToken?: string
        error?: string
    }

    interface User {
        id: string
        name?: string | null
        email?: string | null
        image?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string
        refreshToken?: string
        idToken?: string
        expiresAt?: number
        error?: string
    }
}
