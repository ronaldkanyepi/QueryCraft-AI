# Zitadel Authentication Integration Guide : 

- https://claude.ai/public/artifacts/f0c29285-0882-4611-9f1a-cb3161643716

## 1. Zitadel Configuration

### Step 1: Create a New Project
1. Login to your Zitadel console
2. Navigate to **Projects** and click **Create New Project**
3. Give it a name like "QueryCraft AI"

### Step 2: Create Application
1. In your project, click **New Application**
2. Choose **Web Application**
3. Configure:
   - **Name**: QueryCraft AI Web App
   - **Authentication Method**: PKCE
   - **Redirect URIs**: 
     - `http://localhost:3000/api/auth/callback/zitadel` (development)
     - `https://your-actual-domain.com/api/auth/callback/zitadel` (production)
   - **Post Logout URIs**:
     - `http://localhost:3000/` (development)
     - `https://your-actual-domain.com/` (production)

**IMPORTANT**: Replace `your-actual-domain.com` with your real domain name. The redirect URI must EXACTLY match the pattern:
- Development: `http://localhost:3000/api/auth/callback/zitadel`
- Production: `https://yourdomain.com/api/auth/callback/zitadel`

The `/api/auth/callback/zitadel` part is required by NextAuth.js and must not be changed.

### Step 3: Get Your Credentials
After creating the application, note down:
- **Client ID**
- **Client Secret** (if using confidential client)
- **Issuer URL** (your Zitadel instance URL)

### Step 4: Configure Scopes
Make sure these scopes are enabled:
- `openid`
- `profile` 
- `email`
- `offline_access` (for refresh tokens)

## 2. Environment Variables

Create/update your `.env.local` file:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000  # Change to your actual domain in production
NEXTAUTH_SECRET=your-nextauth-secret-key-here  # Generate: openssl rand -base64 32

# Zitadel Configuration
ZITADEL_ISSUER=https://your-instance.zitadel.cloud
ZITADEL_CLIENT_ID=your-client-id-here
ZITADEL_CLIENT_SECRET=your-client-secret-here

# Backend Configuration
BACKEND_BASE_URL=http://localhost:8005
```

## 3. Install Dependencies

```bash
npm install next-auth @auth/core jsonwebtoken @types/jsonwebtoken
```

## 4. File Structure

Create the following files in your Next.js project:

```
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   └── [...path]/
│   │       └── route.ts (your existing proxy)
│   ├── layout.tsx (updated)
│   └── chat/
│       └── page.tsx (example protected page)
├── components/
│   ├── providers.tsx
│   └── UserDropdown.tsx (updated)
├── lib/
│   ├── auth.ts
│   └── api-client.ts (updated)
├── types/
│   └── next-auth.d.ts
├── middleware.ts
└── .env.local
```

## 5. Implementation Details

### NextAuth Route Handler
Create `app/api/auth/[...nextauth]/route.ts` using the auth configuration.

### Updated Home Page
Update your home page to use the new UserDropdown component:

## 5. Usage

### Protecting Routes
To protect a route, wrap it with `SessionProvider` and use `useSession`:

```tsx
import { useSession } from 'next-auth/react'

export default function ProtectedPage() {
  const { data: session, status } = useSession()
  
  if (status === "loading") return <p>Loading...</p>
  if (status === "unauthenticated") return <p>Access Denied</p>
  
  return <h1>Welcome {session?.user?.name}!</h1>
}
```

### Making Authenticated API Calls
The updated `apiClient` automatically includes authentication headers when the user is signed in.

## 6. Development Testing

1. Start your Next.js app: `npm run dev`
2. Navigate to a protected route
3. You'll be redirected to Zitadel for authentication
4. After successful login, you'll be redirected back with a valid session

## 7. Production Considerations

- **Update all URLs**: In Zitadel configuration, change:
  - `http://localhost:3000/api/auth/callback/zitadel` → `https://your-actual-domain.com/api/auth/callback/zitadel`
  - `http://localhost:3000/` → `https://your-actual-domain.com/`
- **Environment Variables**: Update `NEXTAUTH_URL` to your production domain
- Use a strong `NEXTAUTH_SECRET` in production (generate with `openssl rand -base64 32`)
- Consider implementing refresh token rotation
- Add proper error handling and logging
- Implement proper session management on your FastAPI backend

## 8. Quick Setup Checklist

**Zitadel Configuration:**
- [ ] Project created
- [ ] Web application created with PKCE
- [ ] Redirect URI: `http://localhost:3000/api/auth/callback/zitadel`
- [ ] Post logout URI: `http://localhost:3000/`
- [ ] Scopes enabled: `openid`, `profile`, `email`, `offline_access`
- [ ] Client ID and secret copied

**Environment Variables:**
- [ ] `NEXTAUTH_URL=http://localhost:3000`
- [ ] `NEXTAUTH_SECRET=your-generated-secret`
- [ ] `ZITADEL_ISSUER=https://your-instance.zitadel.cloud`
- [ ] `ZITADEL_CLIENT_ID=your-client-id`
- [ ] `ZITADEL_CLIENT_SECRET=your-client-secret`

**Files Created:**
- [ ] `lib/auth.ts`
- [ ] `app/api/auth/[...nextauth]/route.ts`
- [ ] `components/providers.tsx`
- [ ] Updated `app/layout.tsx`
- [ ] `middleware.ts`
- [ ] `types/next-auth.d.ts`

## 8. FastAPI Backend Integration

Your FastAPI backend will receive the JWT token in the `Authorization` header. You can verify it using Zitadel's public keys:

```python
import jwt
import requests
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_token(token: str = Depends(security)):
    try:
        # Get Zitadel's public keys
        jwks_url = f"{ZITADEL_ISSUER}/.well-known/jwks.json"
        jwks = requests.get(jwks_url).json()
        
        # Verify and decode token
        decoded = jwt.decode(token.credentials, jwks, algorithms=["RS256"], 
                           audience=ZITADEL_CLIENT_ID)
        return decoded
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

## 9. Troubleshooting

- **CORS Issues**: Make sure your Zitadel instance allows requests from your domain
- **Redirect URI Mismatch**: Ensure URIs in Zitadel exactly match your NextAuth configuration
- **Token Expiry**: Implement proper token refresh logic
- **Network Issues**: Check that your app can reach your Zitadel instance

# Zitadel OAuth Flow Explained

This setup provides a complete authentication flow with Zitadel, protecting your routes and API calls while maintaining a smooth user experience.

## OAuth Flow Explanation

The redirect URI in OAuth is not where your users end up - it's where the OAuth provider (Zitadel) sends the authorization code back to your application's backend.

### The Actual Flow

* **User clicks "Sign In"** → Your app redirects to Zitadel.
* **User authenticates with Zitadel** → Zitadel redirects to `/api/auth/callback/zitadel`.
* **NextAuth.js receives the code** → It exchanges the code for tokens.
* **NextAuth.js redirects user** → To your actual app page (like `/dashboard` or `/`).

### Why `/api/auth/callback/zitadel`?

This is NextAuth.js's internal API endpoint that:

* Handles the OAuth callback automatically.
* Exchanges the authorization code for access tokens.
* Creates the user session.
* Redirects the user to where they should actually go.

### Where Users Actually End Up

Users end up where you specify in your sign-in calls or middleware configuration. They will be sent to the page they were originally trying to access.

```typescript
// This is where users actually go after successful login
signIn('zitadel', { callbackUrl: '/dashboard' })
```


- > So the redirect URI is just a technical endpoint for OAuth - users never see it! They see your actual app pages before and after authentication.
This is standard OAuth 2.0 behavior - the redirect URI is always an API endpoint that processes the authorization response, not the final user destination.