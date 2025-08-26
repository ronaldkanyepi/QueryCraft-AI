import httpx
from async_lru import alru_cache
from fastapi import Depends, Header
from fastapi_zitadel_auth import ZitadelAuth
from fastapi_zitadel_auth.exceptions import ForbiddenException
from fastapi_zitadel_auth.user import DefaultZitadelUser

from app.core.config import settings
from app.core.logging import logger

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


@alru_cache(maxsize=128, ttl=300)  # cache for five minutes (300 seconds)
async def fetch_userinfo(access_token: str):
    url = f"{settings.ISSUER_URL}/oidc/v1/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        return resp.json()


async def get_enhanced_user(
    user: DefaultZitadelUser = Depends(zitadel_auth),
    authorization: str = Header(..., alias="Authorization"),
) -> dict:
    """Get authenticated user with additional userinfo"""
    try:
        if not authorization.startswith("Bearer "):
            raise ValueError("Invalid authorization header format")

        access_token = authorization.replace("Bearer ", "")
        additional_info = await fetch_userinfo(access_token)
        user_data = user.claims.__dict__
        user_data["additional_info"] = additional_info
        return user_data

    except Exception as e:
        logger.error(f"Failed to fetch additional user info: {e}")
        user_data = user.claims.__dict__
        user_data.additional_info = {}
        return user_data
