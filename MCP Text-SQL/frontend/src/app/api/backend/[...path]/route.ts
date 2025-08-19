import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "http://localhost:8005";

async function handler(req: NextRequest) {

    const session = await getServerSession(authOptions);


    const requestPath = req.nextUrl.pathname;
    const isAuthRoute = requestPath.includes('/auth');

    if (!isAuthRoute && !session) {
        return NextResponse.json(
            { error: "Unauthorized. Please sign in." },
            { status: 401 }
        );
    }

    const backendPath = requestPath.replace(/^\/api\/backend\//, "/api/v1/");

    console.log("Request path: " + backendPath);
    console.log("backendPath: " + backendPath);

    const backendUrl = `${BACKEND_BASE_URL}${backendPath}${req.nextUrl.search}`;

    console.log(`Proxying request to: ${backendUrl}`);

    const headers = new Headers(req.headers);
    headers.set("host", new URL(backendUrl).host);


    if (session?.accessToken) {
        headers.set("Authorization", `Bearer ${session.accessToken}`);
    }

    // Add user context headers for the backend
    if (session?.user) {
        // headers.set("X-User-ID", session.user?.id || '');
        headers.set("X-User-Email", session.user.email || '');
        headers.set("X-User-Name", session.user.name || '');

    }

    try {
        const backendResponse = await fetch(backendUrl, {
            method: req.method,
            headers: headers,
            body: req.body,
            redirect: 'manual',
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            duplex: 'half'
        });

        return new NextResponse(backendResponse.body, {
            status: backendResponse.status,
            statusText: backendResponse.statusText,
            headers: backendResponse.headers,
        });

    } catch (error) {
        console.error("Proxy error:", error);
        return NextResponse.json(
            { error: "Proxy failed to connect to the backend service." },
            { status: 502 }
        );
    }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
