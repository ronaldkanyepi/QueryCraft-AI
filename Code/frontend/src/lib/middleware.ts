import { withAuth } from "next-auth/middleware"

export default withAuth(
    function middleware(req) {

    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl


                if (
                    pathname === '/' ||
                    pathname.startsWith('/api/auth') ||
                    pathname.startsWith('/auth') ||
                    pathname.startsWith('/_next') ||
                    pathname.startsWith('/favicon')
                ) {
                    return true
                }


                return !!token
            },
        },
    }
)

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|public).*)',
    ]
}
