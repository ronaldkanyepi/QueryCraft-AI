import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions} from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
    try {
        const { accessToken, refreshToken } = await req.json();

        const issuer = process.env.ZITADEL_ISSUER;
        const clientId = process.env.ZITADEL_CLIENT_ID;
        const clientSecret = process.env.ZITADEL_CLIENT_SECRET;

        if (!accessToken || !issuer || !clientId || !clientSecret) {
            return NextResponse.json({ warning: 'Missing tokens or config' });
        }

        const revokePromises = [];


        revokePromises.push(
            fetch(`${issuer}/oauth/v2/revoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                },
                body: new URLSearchParams({
                    token: accessToken,
                    token_type_hint: 'access_token',
                }),
            }).catch(err => console.error('Access token revocation failed:', err))
        );

        // Revoke refresh token if provided
        if (refreshToken) {
            revokePromises.push(
                fetch(`${issuer}/oauth/v2/revoke`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                    },
                    body: new URLSearchParams({
                        token: refreshToken,
                        token_type_hint: 'refresh_token',
                    }),
                }).catch(err => console.error('Refresh token revocation failed:', err))
            );
        }


        await Promise.allSettled(revokePromises);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Token revocation error:', error);
        return NextResponse.json({ success: true, warning: 'Revocation failed' });
    }
}