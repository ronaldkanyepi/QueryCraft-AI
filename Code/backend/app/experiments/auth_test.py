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
    access_token = "..."  # `pragma: allowlist secret`
    asyncio.run(fetch_userinfo(access_token))
