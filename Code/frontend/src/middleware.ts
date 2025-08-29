// middleware.ts (in src folder)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = [
    "/chat",
    "/rag",
    "/dashboard",
    "/profile",
    "/user-info"
];

const publicRoutes = [
    "/api/auth",
    "/auth",
    "/_next",
    "/favicon",
    "/img",
    "/public"
];

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;


    console.log("🔍 MIDDLEWARE TRIGGERED for:", pathname);
    console.log("🔍 Request URL:", request.url);
    console.log("🔍 Next URL:", request.nextUrl.toString());

    // Get the JWT token from the request
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });

    console.log("Token exists:", !!token);
    console.log("Token details:", token ? { sub: token.sub, email: token.email } : "No token");


    if (pathname === "/") {
        console.log("Allowing root path");
        return NextResponse.next();
    }


    const isPublic = publicRoutes.some((route) =>
        pathname === route || pathname.startsWith(route)
    );

    console.log("🔍 Is public route:", isPublic);

    if (isPublic) {
        console.log("Allowing public route:", pathname);
        return NextResponse.next();
    }


    const isProtected = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    );

    console.log("Is protected route:", isProtected);

    if (isProtected && !token) {
        console.log("BLOCKING access to protected route - no token");
        console.log("Redirecting to sign-in");


        // do this and remove pages from auth.ts in lib folder if you dont want a custom page when the user session terminates
        // const signInUrl = new URL("/api/auth/signin/zitadel", request.url);
        const signInUrl = new URL("/auth/signin", request.url);


        console.log("Redirect URL:", signInUrl.toString());
        return NextResponse.redirect(signInUrl);
    }

    console.log("✅ Allowing access to:", pathname);
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes - except /api/auth)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api(?!/auth)|_next/static|_next/image|favicon.ico).*)',
    ]
};
