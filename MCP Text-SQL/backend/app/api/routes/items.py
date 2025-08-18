from fastapi import APIRouter
from app.core.rate_limiter import limiter
from app.core.logging import logger
from app.core.auth import zitadel_auth
from fastapi import Request
from fastapi import Security

router = APIRouter()


@router.get("/")
@limiter.limit("30/minute")
def read_items(request: Request):
    logger.success(f"Request has reached api version 1-> url : {request.url}")
    return {"name": "Ronald Kanyepi", "version": "App version 1 test"}


@router.get(
    "/api/protected/scope",
    summary="Protected endpoint, requires a specific scope",
    dependencies=[Security(zitadel_auth, scopes=["scope1"])],
)
def protected_by_scope(request: Request):
    """Protected endpoint, requires a specific scope"""
    user = request.state.user
    return {"message": "Hello world!", "user": user}
