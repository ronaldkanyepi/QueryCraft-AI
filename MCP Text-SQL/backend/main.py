from contextlib import asynccontextmanager
from typing import AsyncIterator

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api.routes import router
from app.core.auth import zitadel_auth
from app.core.config import StartupChecker, settings
from app.core.database import database_lifespan
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    checker = StartupChecker(settings)
    checker.run()
    await zitadel_auth.openid_config.load_config()
    async with database_lifespan() as checkpointer:
        app.state.checkpointer = checkpointer
        yield


app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.docs_enabled else None,
    redoc_url="/redoc" if settings.docs_enabled else None,
    openapi_url="/openapi.json" if settings.docs_enabled else None,
    lifespan=lifespan,
    swagger_ui_oauth2_redirect_url="/oauth2-redirect",
    swagger_ui_init_oauth={
        "usePkceWithAuthorizationCodeGrant": True,
        "clientId": settings.CLIENT_ID,
        "scopes": " ".join(
            [
                "openid",
                "profile",
                "email",
                "urn:zitadel:iam:org:projects:roles",
                "urn:zitadel:iam:org:project:id:zitadel:aud",
            ]
        ),
    },
)

app.state.limiter = limiter  # type: ignore[attr-defined]
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)  # type: ignore[attr-defined]
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router, prefix=settings.API_V1_STR)

# mount_chainlit(app=app, target="my_cl_app.py", path="/chainlit")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        log_level=settings.LOG_LEVEL.lower(),
        reload=False,
    )
