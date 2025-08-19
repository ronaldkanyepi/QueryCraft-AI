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
    """Validate that the authenticated user is a user with a specific role"""
    required_role = "admin"
    if required_role not in user.claims.project_roles:
        raise ForbiddenException(f"User does not have role assigned: {required_role}")
