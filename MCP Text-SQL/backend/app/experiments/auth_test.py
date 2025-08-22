import asyncio

import httpx

from app.core.config import settings


async def fetch_userinfo(access_token: str):
    url = f"{settings.ISSUER_URL}/oidc/v1/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        print(resp.json())
        return resp.json()


if __name__ == "__main__":
    access_token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjMzMzgyOTc2OTE1NjEwMDA5OSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAiLCJzdWIiOiIzMzM4MzM0NTgwMjk2OTA4ODMiLCJhdWQiOlsiMzMzODMyODE0NTIyNzkzOTg3IiwiMzM0MzY5OTk5MzM2NTA1MzQ3IiwiMzMzODMyMTk1MjU4OTc0MjExIl0sImV4cCI6MTc1NTg0MjczMSwiaWF0IjoxNzU1Nzk5NTMxLCJuYmYiOjE3NTU3OTk1MzEsImNsaWVudF9pZCI6IjMzMzgzMjgxNDUyMjc5Mzk4NyIsImp0aSI6IlYyXzMzNDM3NTg0MDM0MTAzMjk2My1hdF8zMzQzNzU4NDAzNDEwOTg0OTkifQ.Dubby6Mju6QAs5Tn1vl8WlcFGwEuQ39OUlHg6PyIBfrS9mFAVcMstq0g0k1A-Q0DsCslB39qWOr9b-v6IkLnF0V_8d5PzK9edutSVfNKd_ulKSrMvU4-YicPyYGzScuEBWVua1PX0prU_UTMhBsSfWNVLAHyIO_Aom56maDyHi8soKpJoGVbnjcSOLo4erdgyioHn_zHP5kXffgoqYCiCl-dxmRO18mLtP6jwHzlqpWGKnnx-PEkvzDANb8zQFqiNHjnQ9g_Uo5CnK-zd46Q1hm-uLg1n6isa8qEttrOOrzrK45ZY9kmhxNwbEQHh4yMwjWrx0t0uHWpcnXU5Zflmw"  # pragma: allowlist secret
    asyncio.run(fetch_userinfo(access_token))
