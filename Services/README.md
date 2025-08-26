# Complete Zitadel Authentication Integration Guide with FastAPI Backend

## Overview
This guide sets up a complete authentication system using Zitadel with a Next.js frontend and FastAPI backend, using proper JWT access tokens for API authentication.

## 1. Zitadel Configuration

### Step 1: Create a New Project
1. Login to your Zitadel console
2. Navigate to **Projects** and click **Create New Project**
3. Give it a name like "QueryCraft AI"

### Step 2: Create Frontend Web Application
1. In your project, click **New Application**
2. Choose **Web Application**
3. Configure:
   - **Name**: QueryCraft AI Web App
   - **Application Type**: Web
   - **Authentication Method**: PKCE
   - **Redirect URIs**:
     - `http://localhost:3000/api/auth/callback/zitadel` (Next.js development)
     - `http://localhost:8005/docs/oauth2-redirect` (FastAPI Swagger development)
     - `https://your-actual-domain.com/api/auth/callback/zitadel` (production)
     - `https://your-api-domain.com/docs/oauth2-redirect` (production API docs)
   - **Post Logout URIs**:
     - `http://localhost:3000/` (development)
     - `http://localhost:8005/docs` (FastAPI docs development)
     - `https://your-actual-domain.com/` (production)
     - `https://your-api-domain.com/docs` (production API docs)
   - **Token Settings**:
     - Enable: User roles inside ID Token
     - Enable: User Info inside ID Token

### Step 3: Create Backend API Application
1. Click **New Application** again
2. Choose **API Application**
3. Configure:
   - **Name**: QueryCraft AI Backend API
   - **Application Type**: API
   - **Authentication Method**: Private Key JWT
   - **Token Settings**:
     - **Auth Token Type**: **JWT** (IMPORTANT: Not "Bearer Token")
     - Enable: User roles inside access token (if available)

### Step 4: Configure Frontend App Audience
1. Go back to your **Web Application**
2. In **Token Settings** or **OIDC Configuration**:
   - Add your **Backend API's Client ID** to the audience
   - This ensures access tokens are issued for your backend API

### Step 5: Get Your Credentials
Note down these values:
- **Frontend App Client ID**
- **Frontend App Client Secret**
- **Backend API Client ID**
- **Issuer URL** (your Zitadel instance URL)
- **Project ID**

## 2. Environment Variables

### Next.js Frontend (.env.local)
```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000  # Change to your actual domain in production
NEXTAUTH_SECRET=your-nextauth-secret-key-here  # Generate: openssl rand -base64 32

# Zitadel Configuration
ZITADEL_ISSUER=https://your-instance.zitadel.cloud
ZITADEL_CLIENT_ID=your-frontend-client-id
ZITADEL_CLIENT_SECRET=your-frontend-client-secret
ZITADEL_BACKEND_CLIENT_ID=your-backend-api-client-id

# Backend Configuration
BACKEND_BASE_URL=http://localhost:8005
```

### FastAPI Backend (.env)
```env
# Zitadel Configuration
ISSUER_URL=https://your-instance.zitadel.cloud
PROJECT_ID=your-project-id
CLIENT_ID=your-backend-api-client-id  # This should match ZITADEL_BACKEND_CLIENT_ID from frontend

# For Swagger OAuth2 (use Frontend App credentials)
FRONTEND_CLIENT_ID=your-frontend-client-id
FRONTEND_CLIENT_SECRET=your-frontend-client-secret

# Database and other configs...
```

## 3. Next.js Frontend Implementation

### Install Dependencies
```bash
npm install next-auth @auth/core jsonwebtoken @types/jsonwebtoken
```

### NextAuth Configuration (lib/auth.ts)
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
                    audience: process.env.ZITADEL_BACKEND_CLIENT_ID // CRITICAL: Backend API audience
                }
            },
        }),
    ],
    callbacks: {
        jwt({ token, user, account, profile}) {
            if (account) {
                console.log("=== TOKEN DEBUG ===");
                console.log("ID Token is JWT?", account.id_token?.includes('.'));
                console.log("Access Token is JWT?", account.access_token?.includes('.'));
                console.log("=== END DEBUG ===");

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

### API Proxy Route (app/api/backend/[...path]/route.ts)
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "http://localhost:8005";

async function handler(req: NextRequest) {
    // Use getToken for proper JWT access
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

    console.log("=== PROXY DEBUG ===");
    console.log("Access Token is JWT?", token?.accessToken?.includes('.'));
    console.log("Using access token for API call");
    console.log("=== END DEBUG ===");

    const headers = new Headers(req.headers);
    headers.set("host", new URL(backendUrl).host);

    // Use JWT access token for API authentication (SECURE)
    if (token?.accessToken) {
        headers.set("Authorization", `Bearer ${token.accessToken}`);
    }

    // Add user context headers
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

### NextAuth Route Handler (app/api/auth/[...nextauth]/route.ts)
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

### FastAPI App with Swagger OAuth (app/main.py)
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
    docs_url=None,  # Disable default docs to customize
    redoc_url=None,
)

# Custom Swagger UI with OAuth2 configuration
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

# Custom OpenAPI schema with OAuth2 configuration
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="QueryCraft AI API",
        version="1.0.0",
        description="AI-powered query interface with Zitadel authentication",
        routes=app.routes,
    )

    # Add OAuth2 security scheme
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

    # Apply OAuth2 security to all routes
    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            openapi_schema["paths"][path][method]["security"] = [{"OAuth2": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Include your API routes
app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
```

### Authentication Setup (app/core/auth.py)
```python
from fastapi import Depends
from fastapi_zitadel_auth import ZitadelAuth
from fastapi_zitadel_auth.exceptions import ForbiddenException
from fastapi_zitadel_auth.user import DefaultZitadelUser

from app.core.config import settings

zitadel_auth = ZitadelAuth(
    issuer_url=settings.ISSUER_URL,
    project_id=settings.PROJECT_ID,
    app_client_id=settings.CLIENT_ID,  # Backend API Client ID
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
    """Validate that the authenticated user has admin role"""
    required_role = "admin"
    if required_role not in user.claims.project_roles:
        raise ForbiddenException(f"User does not have role assigned: {required_role}")

# Optional: Get current user helper
async def get_current_user(
    user: DefaultZitadelUser = Depends(zitadel_auth)
) -> DefaultZitadelUser:
    """Get current authenticated user"""
    return user
```

### Protected Route Example (app/api/routes/chat.py)
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
    # Optional: Add header debugging
    authorization: str = Header(None, alias="Authorization"),
):
    logger.info(f"Received request: {input}")
    logger.info(f"Authenticated user: {getattr(current_user.claims, 'email', 'unknown')}")
    logger.info(f"User roles: {current_user.claims.project_roles}")

    # Optional: Log token format for debugging
    if authorization:
        token = authorization.replace("Bearer ", "")
        logger.info(f"Token is JWT: {token.count('.') == 2}")

    config = RunnableConfig(configurable={"thread_id": input.thread_id})
    return StreamingResponse(
        Util.stream_generator(input.messages, config),
        media_type="text/event-stream",
    )

# Admin-only route example
@router.get("/admin-only")
async def admin_only_endpoint(
    current_user: DefaultZitadelUser = Depends(validate_is_admin_user),
):
    return {"message": "This is an admin-only endpoint", "user": current_user.claims.email}
```

### Settings Configuration (app/core/config.py)
```python
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Zitadel Configuration
    ISSUER_URL: str
    PROJECT_ID: str
    CLIENT_ID: str  # Backend API Client ID

    # For Swagger OAuth2 (use Frontend App credentials)
    FRONTEND_CLIENT_ID: str  # Frontend Web App Client ID
    FRONTEND_CLIENT_SECRET: str  # Frontend Web App Client Secret

    # Other settings...

    class Config:
        env_file = ".env"

settings = Settings()
```

## 5. Using Swagger UI with Zitadel Authentication

### Testing API with Swagger
1. **Start your FastAPI app**: `uvicorn app.main:app --reload --port 8005`
2. **Navigate to**: `http://localhost:8005/docs`
3. **Click "Authorize" button** in Swagger UI
4. **Configure OAuth2**:
   - **Client ID**: Use your Frontend Web App Client ID
   - **Client Secret**: Use your Frontend Web App Client Secret
   - **Scopes**: Select the scopes you need (openid, email, profile, etc.)
5. **Click "Authorize"** - you'll be redirected to Zitadel
6. **Login with Zitadel** - you'll be redirected back to Swagger
7. **Test protected endpoints** - they should now work with your authenticated session

### Swagger OAuth2 Flow
- **Authorization URL**: `https://your-zitadel-instance.com/oauth/v2/authorize`
- **Token URL**: `https://your-zitadel-instance.com/oauth/v2/token`
- **Redirect URI**: `http://localhost:8005/docs/oauth2-redirect` (automatically handled by Swagger)

## 5. TypeScript Type Definitions

### NextAuth Types (types/next-auth.d.ts)
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

## 6. Security Best Practices

### Frontend Security
- Use JWT access tokens for API calls (not ID tokens)
- Store tokens securely in NextAuth session
- Implement proper token refresh
- Use HTTPS in production

### Backend Security
- Validate JWT tokens using Zitadel's public keys
- Check token audience matches your API
- Implement role-based access control
- Use token leeway for clock skew

## 7. Testing Your Setup

### 1. Test Next.js Authentication
After login, check your console for:
```
=== TOKEN DEBUG ===
ID Token is JWT? true
Access Token is JWT? true  // This should be true now!
=== END DEBUG ===
```

### 2. Test API Call via Proxy
Make a request to your FastAPI backend through Next.js proxy and verify:
- No "Not enough segments" error
- User is properly authenticated
- Roles are available in the token

### 3. Test Swagger UI
1. Go to `http://localhost:8005/docs`
2. Click "Authorize"
3. Enter your Frontend App credentials
4. Login through Zitadel
5. Test protected endpoints

### 4. Verify FastAPI Logs
Your FastAPI logs should show:
```
Authenticated user: user@example.com
Token is JWT: True
User roles: {'admin': {...}}
```

## 8. Troubleshooting

### "Not enough segments" Error
- **Fixed**: Set "Auth Token Type" to "JWT" in Zitadel Backend API config
- **Fixed**: Use `token?.accessToken` in your proxy (not session?.accessToken)

### "Invalid audience" Error
- Ensure Backend API Client ID is in the audience parameter of your frontend app
- Check that `ZITADEL_BACKEND_CLIENT_ID` matches your backend `CLIENT_ID`

### "Token not found" Error
- Verify `getToken()` is used instead of `getServerSession()` in API routes
- Check that NextAuth secret is properly set

### No Roles in Token
- Enable "User roles inside access token" in Zitadel (if available)
- Roles are typically in ID tokens by default

## 9. Production Deployment

### Zitadel Configuration Updates
- Update all `localhost:3000` URLs to your production domain
- Use HTTPS for all redirect URIs
- Update `NEXTAUTH_URL` to production domain

### Security Checklist
- [ ] Use strong `NEXTAUTH_SECRET` in production
- [ ] Enable HTTPS everywhere
- [ ] Implement proper error handling
- [ ] Add rate limiting
- [ ] Monitor authentication logs
- [ ] Implement token refresh logic
- [ ] Use proper CORS settings

## 10. OAuth Flow Explanation

### Complete Authentication Flow

1. **User clicks "Sign In"** → Next.js redirects to Zitadel
2. **User authenticates** → Zitadel redirects to `/api/auth/callback/zitadel`
3. **NextAuth.js receives code** → Exchanges for JWT tokens (with proper audience)
4. **Tokens stored in session** → User redirected to intended page
5. **API calls made** → Next.js proxy adds JWT access token to headers
6. **FastAPI receives JWT** → Validates token using Zitadel's public keys
7. **User authorized** → API responds with protected data

### Key Security Points
- **ID Token**: Used for user identity in frontend (contains user info)
- **Access Token**: Used for API authorization (JWT format, contains audience)
- **Audience**: Ensures access token is meant for your specific API
- **JWT Validation**: FastAPI validates signature using Zitadel's public keys

This setup provides enterprise-grade authentication with proper separation of concerns and follows OAuth2/OIDC security best practices!
