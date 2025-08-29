# QueryCraft AI: Zitadel Authentication Guide

This guide provides a comprehensive walkthrough for setting up a robust authentication system for **QueryCraft AI**, a sophisticated AI-powered query interface. It leverages the enterprise-grade features of **Zitadel** for identity management, a **Next.js** frontend for a seamless user experience, and a **FastAPI** backend for a secure and scalable API.

The primary focus of this guide is to establish a secure authentication mechanism using **JSON Web Tokens (JWTs)**, ensuring that all API communications are properly authenticated and authorized.

## System Architecture

The following diagram illustrates the high-level architecture of the QueryCraft AI authentication system:

```
+-----------------+      +-----------------+      +-----------------+
|   Next.js       |----->|   Zitadel       |----->|   FastAPI       |
|   Frontend      |      |   Auth Server   |      |   Backend       |
+-----------------+      +-----------------+      +-----------------+
```

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** and **npm** (for the Next.js frontend)
*   **Python** and **pip** (for the FastAPI backend)
*   **Docker** and **Docker Compose** (for running the services)
*   A **Zitadel** account

## 1. Zitadel Configuration

The first step is to configure Zitadel to handle the authentication for both the frontend and backend applications.

### Step 1: Create a New Project

1.  Log in to your Zitadel console.
2.  Navigate to **Projects** and click **Create New Project**.
3.  Enter a project name, such as "QueryCraft AI".

### Step 2: Create the Frontend Web Application

1.  Within your project, click **New Application**.
2.  Select **Web Application** and configure it as follows:
    *   **Name**: QueryCraft AI Web App
    *   **Application Type**: Web
    *   **Authentication Method**: PKCE
    *   **Redirect URIs**:
        *   `http://localhost:3000/api/auth/callback/zitadel` (Next.js development)
        *   `http://localhost:8005/docs/oauth2-redirect` (FastAPI Swagger development)
        *   `https://your-actual-domain.com/api/auth/callback/zitadel` (production)
        *   `https://your-api-domain.com/docs/oauth2-redirect` (production API docs)
    *   **Post Logout URIs**:
        *   `http://localhost:3000/` (development)
        *   `http://localhost:8005/docs` (FastAPI docs development)
        *   `https://your-actual-domain.com/` (production)
        *   `https://your-api-domain.com/docs` (production API docs)
    *   **Token Settings**:
        *   Enable: **User roles inside ID Token**
        *   Enable: **User Info inside ID Token**

### Step 3: Create the Backend API Application

1.  Click **New Application** again.
2.  Select **API Application** and configure it as follows:
    *   **Name**: QueryCraft AI Backend API
    *   **Application Type**: API
    *   **Authentication Method**: Private Key JWT
    *   **Token Settings**:
        *   **Auth Token Type**: **JWT** (This is a critical setting)
        *   Enable: **User roles inside access token** (if available)

### Step 4: Configure the Frontend App Audience

1.  Navigate back to your **Web Application** settings.
2.  In the **Token Settings** or **OIDC Configuration**, add your **Backend API's Client ID** to the audience. This ensures that the access tokens issued are intended for your backend API.

### Step 5: Gather Your Credentials

Make a note of the following values, as you will need them for the environment configuration:

*   **Frontend App Client ID**
*   **Frontend App Client Secret**
*   **Backend API Client ID**
*   **Issuer URL** (your Zitadel instance URL)
*   **Project ID**

## 2. Environment Configuration

Create `.env` files for both the frontend and backend applications with the following settings.

### Next.js Frontend (`.env.local`)

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Zitadel Configuration
ZITADEL_ISSUER=https://your-instance.zitadel.cloud
ZITADEL_CLIENT_ID=your-frontend-client-id
ZITADEL_CLIENT_SECRET=your-frontend-client-secret
ZITADEL_BACKEND_CLIENT_ID=your-backend-api-client-id

# Backend Configuration
BACKEND_BASE_URL=http://localhost:8005
```

### FastAPI Backend (`.env`)

```env
# Zitadel Configuration
ISSUER_URL=https://your-instance.zitadel.cloud
PROJECT_ID=your-project-id
CLIENT_ID=your-backend-api-client-id

# For Swagger OAuth2 (use Frontend App credentials)
FRONTEND_CLIENT_ID=your-frontend-client-id
FRONTEND_CLIENT_SECRET=your-frontend-client-secret
```

## 3. Next.js Frontend Implementation

### Install Dependencies

```bash
npm install next-auth @auth/core jsonwebtoken @types/jsonwebtoken
```

### NextAuth Configuration (`lib/auth.ts`)

```typescript
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
```

### API Proxy Route (`app/api/backend/[...path]/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "http://localhost:8005";

async function handler(req: NextRequest) {
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET
    });

    const requestPath = req.nextUrl.pathname;
    const isAuthRoute = requestPath.includes('/auth');

    if (!isAuthRoute && !token) {
        return NextResponse.json(
            { error: "Unauthorized. Please sign in." },
            { status: 401 }
        );
    }

    const backendPath = requestPath.replace(/^\/api\/backend\//, "/api/v1/");
    const backendUrl = `${BACKEND_BASE_URL}${backendPath}${req.nextUrl.search}`;

    const headers = new Headers(req.headers);
    headers.set("host", new URL(backendUrl).host);

    if (token?.accessToken) {
        headers.set("Authorization", `Bearer ${token.accessToken}`);
    }

    if (token?.email) {
        headers.set("X-User-Email", token.email);
    }
    if (token?.name) {
        headers.set("X-User-Name", token.name);
    }

    try {
        const backendResponse = await fetch(backendUrl, {
            method: req.method,
            headers: headers,
            body: req.body,
            redirect: 'manual',
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
```

### NextAuth Route Handler (`app/api/auth/[...nextauth]/route.ts`)

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

## 4. FastAPI Backend Implementation

### Install Dependencies

```bash
pip install fastapi-zitadel-auth python-jose[cryptography] requests
```

### FastAPI App with Swagger OAuth (`app/main.py`)

```python
from fastapi import FastAPI
from fastapi.security import OAuth2AuthorizationCodeBearer
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi

from app.core.config import settings
from app.api.routes import chat

app = FastAPI(
    title="QueryCraft AI API",
    description="AI-powered query interface with Zitadel authentication",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
)

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="QueryCraft AI API",
        oauth2_redirect_url="/docs/oauth2-redirect",
        swagger_ui_parameters={
            "persistAuthorization": True,
        }
    )

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="QueryCraft AI API",
        version="1.0.0",
        description="AI-powered query interface with Zitadel authentication",
        routes=app.routes,
    )

    openapi_schema["components"]["securitySchemes"] = {
        "OAuth2": {
            "type": "oauth2",
            "flows": {
                "authorizationCode": {
                    "authorizationUrl": f"{settings.ISSUER_URL}/oauth/v2/authorize",
                    "tokenUrl": f"{settings.ISSUER_URL}/oauth/v2/token",
                    "scopes": {
                        "openid": "OpenID Connect",
                        "email": "Email access",
                        "profile": "Profile access",
                        "urn:zitadel:iam:org:project:roles": "Project roles"
                    }
                }
            }
        }
    }

    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            openapi_schema["paths"][path][method]["security"] = [{"OAuth2": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
```

### Authentication Setup (`app/core/auth.py`)

```python
from fastapi import Depends
from fastapi_zitadel_auth import ZitadelAuth
from fastapi_zitadel_auth.exceptions import ForbiddenException
from fastapi_zitadel_auth.user import DefaultZitadelUser

from app.core.config import settings

zitadel_auth = ZitadelAuth(
    issuer_url=settings.ISSUER_URL,
    project_id=settings.PROJECT_ID,
    app_client_id=settings.CLIENT_ID,
    allowed_scopes={
        "openid": "OpenID Connect",
        "email": "Email",
        "profile": "Profile",
        "urn:zitadel:iam:org:project:id:zitadel:aud": "Audience",
        "urn:zitadel:iam:org:projects:roles": "Projects roles",
    },
    token_leeway=3,
)

async def validate_is_admin_user(
    user: DefaultZitadelUser = Depends(zitadel_auth),
) -> None:
    required_role = "admin"
    if required_role not in user.claims.project_roles:
        raise ForbiddenException(f"User does not have role assigned: {required_role}")

async def get_current_user(
    user: DefaultZitadelUser = Depends(zitadel_auth)
) -> DefaultZitadelUser:
    return user
```

### Protected Route Example (`app/api/routes/chat.py`)

```python
import asyncio
import json

from fastapi import APIRouter, Depends, Header
from langchain_core.runnables import RunnableConfig
from starlette.requests import Request
from starlette.responses import StreamingResponse

from app.core.auth import DefaultZitadelUser, zitadel_auth, get_current_user
from app.core.logging import logger
from app.schemas.chat import ChatRequest
from app.utils.util import Util

router = APIRouter()

@router.post("")
async def chat(
    request: Request,
    input: ChatRequest,
    current_user: DefaultZitadelUser = Depends(get_current_user),
    authorization: str = Header(None, alias="Authorization"),
):
    logger.info(f"Received request: {input}")
    logger.info(f"Authenticated user: {getattr(current_user.claims, 'email', 'unknown')}")
    logger.info(f"User roles: {current_user.claims.project_roles}")

    if authorization:
        token = authorization.replace("Bearer ", "")
        logger.info(f"Token is JWT: {token.count('.') == 2}")

    config = RunnableConfig(configurable={"thread_id": input.thread_id})
    return StreamingResponse(
        Util.stream_generator(input.messages, config),
        media_type="text/event-stream",
    )

@router.get("/admin-only")
async def admin_only_endpoint(
    current_user: DefaultZitadelUser = Depends(validate_is_admin_user),
):
    return {"message": "This is an admin-only endpoint", "user": current_user.claims.email}
```

### Settings Configuration (`app/core/config.py`)

```python
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Zitadel Configuration
    ISSUER_URL: str
    PROJECT_ID: str
    CLIENT_ID: str

    # For Swagger OAuth2 (use Frontend App credentials)
    FRONTEND_CLIENT_ID: str
    FRONTEND_CLIENT_SECRET: str

    class Config:
        env_file = ".env"

settings = Settings()
```

## 5. Using Swagger UI with Zitadel Authentication

### Testing the API with Swagger

1.  **Start your FastAPI app**: `uvicorn app.main:app --reload --port 8005`
2.  **Navigate to**: `http://localhost:8005/docs`
3.  Click the **Authorize** button in the Swagger UI.
4.  **Configure OAuth2**:
    *   **Client ID**: Use your Frontend Web App Client ID.
    *   **Client Secret**: Use your Frontend Web App Client Secret.
    *   **Scopes**: Select the required scopes (e.g., `openid`, `email`, `profile`).
5.  Click **Authorize** to be redirected to Zitadel for login.
6.  After a successful login, you will be redirected back to the Swagger UI.
7.  You can now test the protected endpoints.

### Swagger OAuth2 Flow

*   **Authorization URL**: `https://your-zitadel-instance.com/oauth/v2/authorize`
*   **Token URL**: `https://your-zitadel-instance.com/oauth/v2/token`
*   **Redirect URI**: `http://localhost:8005/docs/oauth2-redirect` (handled automatically by Swagger)

## 6. TypeScript Type Definitions

### NextAuth Types (`types/next-auth.d.ts`)

```typescript
import "next-auth"
import "next-auth/jwt"

type UserRoles = {
    [key: string]: {
        [key: string]: string;
    };
};

declare module "next-auth" {
    interface Profile {
        given_name?: string;
        family_name?: string;
        preferred_username?: string;
        "urn:zitadel:iam:org:project:roles"?: UserRoles;
        locale?: string;
        email_verified?: boolean;
        gender?: string;
        auth_time?: number;
        updated_at?: number;
    }

    interface User {
        id?: string;
        given_name?: string;
        family_name?: string;
        preferred_username?: string;
        roles?: UserRoles;
        locale?: string;
        email_verified?: boolean;
        gender?: string;
        auth_time?: number;
        updated_at?: number;
    }

    interface Session {
        user: User;
        idToken?: string;
        accessToken?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        idToken?: string;
        accessToken?: string;
        given_name?: string;
        family_name?: string;
        preferred_username?: string;
        roles?: UserRoles;
        locale?: string;
        email_verified?: boolean;
        gender?: string;
        auth_time?: number;
        updated_at?: number;
    }
}
```

## 7. Security Best Practices

### Frontend Security

*   Use JWT access tokens for API calls, not ID tokens.
*   Store tokens securely in the NextAuth session.
*   Implement a proper token refresh mechanism.
*   Use HTTPS in production.

### Backend Security

*   Validate JWTs using Zitadel's public keys.
*   Verify that the token's audience matches your API.
*   Implement role-based access control (RBAC).
*   Use a token leeway to account for clock skew.

## 8. Testing Your Setup

### 1. Test Next.js Authentication

After a successful login, check your browser's console for the following output:

```
=== TOKEN DEBUG ===
ID Token is JWT? true
Access Token is JWT? true
=== END DEBUG ===
```

### 2. Test the API Call via the Proxy

Make a request to your FastAPI backend through the Next.js proxy and verify the following:

*   There are no "Not enough segments" errors.
*   The user is properly authenticated.
*   The user's roles are available in the token.

### 3. Test the Swagger UI

1.  Go to `http://localhost:8005/docs`.
2.  Click **Authorize**.
3.  Enter your Frontend App credentials.
4.  Log in through Zitadel.
5.  Test the protected endpoints.

### 4. Verify the FastAPI Logs

Your FastAPI logs should contain the following information:

```
Authenticated user: user@example.com
Token is JWT: True
User roles: {'admin': {...}}
```

## 9. Troubleshooting

### "Not enough segments" Error

*   **Solution**: Ensure that the **Auth Token Type** is set to **JWT** in the Zitadel Backend API configuration.
*   **Solution**: Use `token?.accessToken` in your proxy, not `session?.accessToken`.

### "Invalid audience" Error

*   **Solution**: Ensure that the Backend API Client ID is included in the audience parameter of your frontend application.
*   **Solution**: Check that the `ZITADEL_BACKEND_CLIENT_ID` in your frontend's `.env` file matches the `CLIENT_ID` in your backend's `.env` file.

### "Token not found" Error

*   **Solution**: Verify that `getToken()` is used instead of `getServerSession()` in your API routes.
*   **Solution**: Check that the `NEXTAUTH_SECRET` is properly set in your frontend's `.env` file.

### No Roles in Token

*   **Solution**: Enable **User roles inside access token** in the Zitadel configuration.
*   **Note**: By default, roles are typically included in the ID token.

## 10. Production Deployment

### Zitadel Configuration Updates

*   Update all `localhost:3000` URLs to your production domain.
*   Use HTTPS for all redirect URIs.
*   Update the `NEXTAUTH_URL` to your production domain.

### Security Checklist

- [ ] Use a strong `NEXTAUTH_SECRET` in production.
- [ ] Enable HTTPS everywhere.
- [ ] Implement proper error handling.
- [ ] Add rate limiting to your API.
- [ ] Monitor authentication logs.
- [ ] Implement a token refresh strategy.
- [ ] Configure Cross-Origin Resource Sharing (CORS) settings.

## 11. OAuth Flow Explanation

### Complete Authentication Flow

1.  **User clicks "Sign In"**: The Next.js frontend redirects the user to Zitadel.
2.  **User authenticates**: Zitadel redirects the user to `/api/auth/callback/zitadel`.
3.  **NextAuth.js receives the authorization code**: It exchanges the code for JWTs (with the proper audience).
4.  **Tokens are stored in the session**: The user is redirected to the intended page.
5.  **API calls are made**: The Next.js proxy adds the JWT access token to the request headers.
6.  **FastAPI receives the JWT**: It validates the token using Zitadel's public keys.
7.  **User is authorized**: The API responds with the protected data.

### Key Security Points

*   **ID Token**: Used for user identity in the frontend (contains user information).
*   **Access Token**: Used for API authorization (in JWT format, contains the audience).
*   **Audience**: Ensures that the access token is intended for your specific API.
*   **JWT Validation**: The FastAPI backend validates the token's signature using Zitadel's public keys.

This setup provides an enterprise-grade authentication solution with a proper separation of concerns, following OAuth2 and OIDC security best practices.

## Running the Services with Docker

To run the services using Docker, follow these steps:

1.  Create a shared Docker network:

    ```bash
    docker network create shared-net
    ```

2.  Run the Zitadel service:

    ```bash
    docker-compose -p zitadel -f docker-compose.zitadel.yaml up -d
    ```

3.  Run the Langfuse service:

    ```bash
    docker-compose -p langfuse -f docker-compose.langfuse.yaml up -d
    ```

4.  Run the database service:

    ```bash
    docker-compose -p app -f docker-compose.db.yaml up -d
    ```

To stop the services, use the following commands:

```bash
docker-compose -p zitadel -f docker-compose.zitadel.yaml down
docker-compose -p langfuse -f docker-compose.langfuse.yaml down
docker-compose -p app -f docker-compose.db.yaml down
```
